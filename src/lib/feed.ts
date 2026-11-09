/**
 * What the home screen shows: which bars match the filter, in what order, which single deal to
 * feature for each, and how its map pin is colored.
 */
import { dealStatus, type DealStatus } from './deals';
import type { DealSchedule } from './time';

export type FeedFilter = 'now' | 'soon' | 'all';

/** "Starting soon" means within this many minutes. */
export const SOON_WINDOW_MIN = 4 * 60;

export function matchesFilter(status: DealStatus, filter: FeedFilter): boolean {
  if (filter === 'all') return true;
  if (status.kind === 'active') return true;
  return filter === 'soon' && status.kind === 'upcoming' && status.startsInMin <= SOON_WINDOW_MIN;
}

/** Live first (most time left first), then upcoming (soonest first), then the rest. */
export function rankStatus(status: DealStatus): number {
  if (status.kind === 'active') return -(status.endsInMin ?? Number.MAX_SAFE_INTEGER);
  if (status.kind === 'upcoming') return 1e9 + status.startsInMin;
  return 2e9;
}

export function pinTone(status: DealStatus): 'live' | 'soon' | 'idle' {
  if (status.kind === 'active') return 'live';
  if (status.kind === 'upcoming' && status.startsInMin <= SOON_WINDOW_MIN) return 'soon';
  return 'idle';
}

/**
 * The deal worth showing in a one-line summary: one that's live (the one running longest),
 * else the next to start, else the first listed.
 */
export function featuredDeal<D extends DealSchedule>(deals: readonly D[], now: Date): D | null {
  let best: { deal: D; rank: number } | null = null;
  for (const deal of deals) {
    const rank = rankStatus(dealStatus([deal], now));
    if (!best || rank < best.rank) best = { deal, rank };
  }
  return best?.deal ?? null;
}
