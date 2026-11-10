import { addDays, type LocalDate, localDate, MARKET_TZ } from './time';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 960 -> "4 PM", 990 -> "4:30 PM", 0/1440 -> "12 AM". */
export function formatMinuteOfDay(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatWindow(startMin: number, endMin: number): string {
  return `${formatMinuteOfDay(startMin)} – ${formatMinuteOfDay(endMin)}`;
}

/** [1,2,3,4,5] -> "Mon–Fri", all -> "Daily", [5,6,0] -> "Fri–Sun", [1,3] -> "Mon, Wed". */
export function formatDays(days: readonly number[]): string {
  const set = new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (set.size === 0) return '';
  if (set.size === 7) return 'Daily';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';

  // Start at a day whose previous day is absent so wrap-around runs (Fri–Sun) stay together.
  let startDay = 0;
  while (!set.has(startDay) || set.has((startDay + 6) % 7)) startDay++;

  const runs: number[][] = [];
  for (let k = 0; k < 7; k++) {
    const d = (startDay + k) % 7;
    if (!set.has(d)) continue;
    const last = runs[runs.length - 1];
    if (last && (last[last.length - 1] + 1) % 7 === d) last.push(d);
    else runs.push([d]);
  }
  return runs
    .map((r) => (r.length >= 3 ? `${DAY_SHORT[r[0]]}–${DAY_SHORT[r[r.length - 1]]}` : r.map((d) => DAY_SHORT[d]).join(', ')))
    .join(', ');
}

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

/** Clock time in the market's timezone, e.g. "6:45 PM". */
export function formatClock(date: Date, tz: string = MARKET_TZ): string {
  let f = clockFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
    clockFormatters.set(tz, f);
  }
  return f.format(date);
}

/** 45 -> "45 min", 60 -> "1 hr", 135 -> "2 hr 15 min". */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatVerified(iso: string | null, now: Date): string {
  if (!iso) return 'Not yet verified';
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Verified today';
  if (days === 1) return 'Verified yesterday';
  if (days < 30) return `Verified ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Verified ${months} month${months === 1 ? '' : 's'} ago`;
}

/** A calendar date as Postgres/ISO "YYYY-MM-DD". */
export function isoDate(d: Pick<LocalDate, 'year' | 'month' | 'day'>): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

/** "today at 5:12 PM", "yesterday at 9 PM", "Mon at 6:30 PM" (market time, within a week). */
export function formatRecent(iso: string, now: Date, tz: string = MARKET_TZ): string {
  const at = new Date(iso);
  const day = isoDate(localDate(at, tz));
  const today = localDate(now, tz);
  const clock = formatClock(at, tz);
  if (day === isoDate(today)) return `today at ${clock}`;
  if (day === isoDate(addDays(today, -1))) return `yesterday at ${clock}`;
  return `${DAY_SHORT[localDate(at, tz).weekday]} at ${clock}`;
}

/** "Confirmed by 4 people this week · last today at 5:12 PM", or null when nobody has. */
export function formatConfirmations(count: number, lastIso: string | null, now: Date, tz: string = MARKET_TZ): string | null {
  if (count <= 0) return null;
  const who = count === 1 ? '1 person' : `${count} people`;
  return lastIso ? `Confirmed by ${who} this week · last ${formatRecent(lastIso, now, tz)}` : `Confirmed by ${who} this week`;
}
