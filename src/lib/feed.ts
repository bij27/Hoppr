/**
 * What the home screen shows: which bars match the time tab and filters, in what order, the one
 * listing to feature, event badges, and how the map pin is colored.
 *
 * Colors stay about deals: green = a deal is on, amber = one starts soon, red = nothing soon.
 * A bar where only an event is on (live music, karaoke...) gets an ink pin and an event badge.
 */
// Relative imports: unit tests run without the app's @/ path alias.
import type { Deal, Venue } from '../data/types';
import { dealStatus, type DealStatus } from './deals';
import { tagGroup } from './tags';
import type { DealSchedule } from './time';

export type FeedFilter = 'now' | 'soon' | 'all';
export type DealTypeFilter = 'food' | 'drinks';

export type FeedQuery = {
  time: FeedFilter;
  /** Selected tag slugs (events and features). */
  tags: readonly string[];
  /** Food deals / drink deals. */
  types: readonly DealTypeFilter[];
};

export type PinTone = 'live' | 'soon' | 'idle' | 'event';

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
 * The listing worth showing in a one-line summary: one that's live (the one running longest),
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

export const isEvent = (d: Pick<Deal, 'kind'>) => d.kind === 'event';

export type VenueView = {
  /** Status of the listings that matter (deals, or the filtered listings when filtering). */
  status: DealStatus;
  /** Hide the status line when it would only say "nothing soon" next to a live event badge. */
  showStatus: boolean;
  /** Events on right now (shown as badges). */
  liveEvents: Deal[];
  /** When no event is on: the next one starting within SOON_WINDOW_MIN. */
  nextEvent: { deal: Deal; startsInMin: number } | null;
  headline: Deal | null;
  tone: PinTone;
  rank: number;
};

/** Ranks bars with only a live event between live deals and upcoming ones. */
const EVENT_ONLY_RANK = 0.5e9;

/**
 * How one bar appears for a query, or null if it doesn't match. Filters: OR within a group
 * (events, deal types, features), AND across groups. With an event or deal-type filter, the time
 * tab applies to the matching listings ("Live now" + Karaoke = karaoke on now).
 */
export function viewVenue(venue: Venue, now: Date, query: FeedQuery): VenueView | null {
  const eventTags = query.tags.filter((t) => tagGroup(t) === 'events');
  const featureTags = query.tags.filter((t) => tagGroup(t) === 'features');
  if (featureTags.length > 0 && !featureTags.some((t) => venue.tags?.includes(t))) return null;

  const events = venue.deals.filter(isEvent);
  const deals = venue.deals.filter((d) => !isEvent(d));
  const filteringListings = eventTags.length > 0 || query.types.length > 0;
  const focus = filteringListings
    ? venue.deals.filter(
        (d) =>
          (eventTags.length === 0 || (d.tags ?? []).some((t) => eventTags.includes(t))) &&
          (query.types.length === 0 || (!isEvent(d) && query.types.some((t) => d.category === t || d.category === 'both'))),
      )
    : deals;
  if (filteringListings && focus.length === 0) return null;

  const status = dealStatus(focus, now);
  const liveEvents: Deal[] = [];
  let nextEvent: VenueView['nextEvent'] = null;
  for (const e of events) {
    const s = dealStatus([e], now);
    if (s.kind === 'active') liveEvents.push(e);
    else if (s.kind === 'upcoming' && s.startsInMin <= SOON_WINDOW_MIN && (!nextEvent || s.startsInMin < nextEvent.startsInMin)) {
      nextEvent = { deal: e, startsInMin: s.startsInMin };
    }
  }
  if (liveEvents.length > 0) nextEvent = null;

  // Which live listings count toward the pin: the filtered ones, or all events when not filtering.
  const relevantLiveEvents = filteringListings ? liveEvents.filter((e) => focus.includes(e)) : liveEvents;
  const dealLive = focus.some((d) => !isEvent(d) && dealStatus([d], now).kind === 'active');

  let matches = matchesFilter(status, query.time);
  if (!matches && !filteringListings) {
    matches = query.time === 'now' ? liveEvents.length > 0 : liveEvents.length > 0 || nextEvent !== null;
  }
  if (!matches) return null;

  const tone: PinTone = dealLive ? 'live' : relevantLiveEvents.length > 0 ? 'event' : pinTone(status);
  const rank = tone === 'event' && status.kind !== 'active' ? EVENT_ONLY_RANK : rankStatus(status);

  return {
    status,
    showStatus: !(status.kind === 'none' && liveEvents.length > 0),
    liveEvents,
    nextEvent,
    headline: featuredDeal(focus, now) ?? featuredDeal(events, now),
    tone,
    rank,
  };
}
