/**
 * Timezone-aware happy hour schedule logic.
 *
 * Deal schedules are stored as venue-local wall-clock times (e.g. "Mon–Fri, 4–7 PM"),
 * so every check converts an absolute instant into the venue's local day + minute.
 */

export const MARKET_TZ = 'America/New_York';

export const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7;
const MS_PER_MINUTE = 60_000;

/** 0 = Sunday … 6 = Saturday (matches JS Date#getDay and Postgres EXTRACT(DOW)). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DealSchedule = {
  /** Days the window STARTS on. An overnight window (e.g. Fri 10 PM – 2 AM) is listed under Fri. */
  days: readonly number[];
  /** Minutes after local midnight, 0–1439. */
  startMin: number;
  /** Minutes after local midnight, 1–1440. If <= startMin the window runs past midnight. */
  endMin: number;
};

export type LocalTime = { day: DayOfWeek; minute: number };

const WEEKDAYS: Record<string, DayOfWeek> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: DayOfWeek };

function zonedParts(ms: number, tz: string): ZonedParts {
  const out: Partial<ZonedParts> = {};
  for (const p of partsFormatter(tz).formatToParts(new Date(ms))) {
    switch (p.type) {
      case 'weekday':
        out.weekday = WEEKDAYS[p.value];
        break;
      case 'year':
      case 'month':
      case 'day':
      case 'minute':
        out[p.type] = Number(p.value);
        break;
      case 'hour':
        // Some engines render midnight as "24" even with h23.
        out.hour = Number(p.value) % 24;
        break;
    }
  }
  if (
    out.weekday === undefined ||
    out.year === undefined ||
    out.month === undefined ||
    out.day === undefined ||
    out.hour === undefined ||
    out.minute === undefined
  ) {
    throw new Error(`Could not resolve local time in timezone "${tz}"`);
  }
  return out as ZonedParts;
}

export function floorToMinute(ms: number): number {
  return Math.floor(ms / MS_PER_MINUTE) * MS_PER_MINUTE;
}

export function localTime(date: Date, tz: string = MARKET_TZ): LocalTime {
  const p = zonedParts(date.getTime(), tz);
  return { day: p.weekday, minute: p.hour * 60 + p.minute };
}

/** Offset of local wall time from UTC, in minutes (EST = -300, EDT = -240). */
export function utcOffsetMinutes(date: Date, tz: string = MARKET_TZ): number {
  const ms = floorToMinute(date.getTime());
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - ms) / MS_PER_MINUTE);
}

export function isScheduleActive(s: DealSchedule, t: LocalTime): boolean {
  if (s.startMin === s.endMin) return false; // invalid; rejected by validateSchedule + DB constraint
  if (s.startMin < s.endMin) {
    return s.days.includes(t.day) && t.minute >= s.startMin && t.minute < s.endMin;
  }
  // Overnight: active from startMin on a listed day, until endMin on the following day.
  const prevDay = (t.day + 6) % 7;
  return (s.days.includes(t.day) && t.minute >= s.startMin) || (s.days.includes(prevDay) && t.minute < s.endMin);
}

export function validateSchedule(s: DealSchedule): string[] {
  const errors: string[] = [];
  if (s.days.length === 0) errors.push('Pick at least one day.');
  if (s.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) errors.push('Days must be 0 (Sun) to 6 (Sat).');
  if (new Set(s.days).size !== s.days.length) errors.push('Days must not repeat.');
  if (!Number.isInteger(s.startMin) || s.startMin < 0 || s.startMin > 1439) errors.push('Start time is invalid.');
  if (!Number.isInteger(s.endMin) || s.endMin < 1 || s.endMin > 1440) errors.push('End time is invalid.');
  if (s.startMin === s.endMin) errors.push('Start and end time cannot be the same.');
  return errors;
}

/**
 * Minute-by-minute activity starting at `start` (floored to the minute):
 * mask[i] === 1 if any schedule is active during minute i.
 *
 * Fast path: when the UTC offset is the same at both ends of the range, local time advances
 * in lockstep with real time, so we resolve the timezone once. If a DST change falls inside
 * the range we resolve every minute individually. Intended for ranges up to ~1 day.
 */
export function activeMask(
  schedules: readonly DealSchedule[],
  start: Date,
  lengthMin: number,
  tz: string = MARKET_TZ,
): Uint8Array {
  const mask = new Uint8Array(Math.max(0, lengthMin));
  if (schedules.length === 0 || mask.length === 0) return mask;

  const startMs = floorToMinute(start.getTime());
  const endMs = startMs + (mask.length - 1) * MS_PER_MINUTE;
  const linear = utcOffsetMinutes(new Date(startMs), tz) === utcOffsetMinutes(new Date(endMs), tz);

  let baseMinuteOfWeek = 0;
  if (linear) {
    const lt = localTime(new Date(startMs), tz);
    baseMinuteOfWeek = lt.day * MINUTES_PER_DAY + lt.minute;
  }

  for (let i = 0; i < mask.length; i++) {
    let t: LocalTime;
    if (linear) {
      const mow = (baseMinuteOfWeek + i) % MINUTES_PER_WEEK;
      t = { day: Math.floor(mow / MINUTES_PER_DAY) as DayOfWeek, minute: mow % MINUTES_PER_DAY };
    } else {
      t = localTime(new Date(startMs + i * MS_PER_MINUTE), tz);
    }
    for (const s of schedules) {
      if (isScheduleActive(s, t)) {
        mask[i] = 1;
        break;
      }
    }
  }
  return mask;
}
