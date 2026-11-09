import { formatClock } from './format';
import { activeMask, type DealSchedule, localTime, MARKET_TZ } from './time';

/** How far ahead deal statuses look. Must stay under 24 hrs (statusLabel relies on it). */
export const STATUS_LOOKAHEAD_MIN = 12 * 60;

const MS_PER_MINUTE = 60_000;

export type DealStatus =
  | { kind: 'active'; /** null = still going past the lookahead */ endsInMin: number | null }
  | { kind: 'upcoming'; startsInMin: number }
  | { kind: 'none' };

/** Whether any of the schedules is live right now, or when the next one starts (within the lookahead). */
export function dealStatus(
  schedules: readonly DealSchedule[],
  now: Date,
  tz: string = MARKET_TZ,
  lookaheadMin: number = STATUS_LOOKAHEAD_MIN,
): DealStatus {
  const mask = activeMask(schedules, now, lookaheadMin + 1, tz);
  if (mask.length === 0) return { kind: 'none' };
  if (mask[0]) {
    let i = 1;
    while (i < mask.length && mask[i]) i++;
    return { kind: 'active', endsInMin: i < mask.length ? i : null };
  }
  const next = mask.indexOf(1);
  return next === -1 ? { kind: 'none' } : { kind: 'upcoming', startsInMin: next };
}

/** Human label for a status computed by dealStatus() at the same `now` (default lookahead). */
export function statusLabel(status: DealStatus, now: Date, tz: string = MARKET_TZ): string {
  const base = Math.floor(now.getTime() / MS_PER_MINUTE) * MS_PER_MINUTE;
  switch (status.kind) {
    case 'active':
      return status.endsInMin === null
        ? 'Live now'
        : `Live until ${formatClock(new Date(base + status.endsInMin * MS_PER_MINUTE), tz)}`;
    case 'upcoming': {
      const startsAt = new Date(base + status.startsInMin * MS_PER_MINUTE);
      // The lookahead is under 24 hrs, so a start on a different local day is always tomorrow.
      const tomorrow = localTime(startsAt, tz).day !== localTime(new Date(base), tz).day;
      return `Starts ${tomorrow ? 'tomorrow ' : ''}${formatClock(startsAt, tz)}`;
    }
    case 'none':
      return `Nothing in the next ${STATUS_LOOKAHEAD_MIN / 60} hrs`;
  }
}
