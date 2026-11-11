/**
 * Pure crawl-selection logic (no React), so it can be unit tested.
 *
 * A stop is a venue plus the deals the user is going there for. Adding a whole bar selects all
 * of its deals; adding a single deal selects just that one. The route planner only times visits
 * against the selected deals.
 */
// Relative import: unit tests run without the app's @/ path alias.
import { MAX_CRAWL_STOPS } from '../lib/crawl';

export type CrawlStop = {
  venueId: string;
  /** Deals this stop is for. Empty only for a venue that has no deals listed. */
  dealIds: readonly string[];
};

export type VenueRef = { id: string; deals: readonly { id: string }[] };

export type ToggleResult = { stops: CrawlStop[]; ok: boolean };

function find(stops: readonly CrawlStop[], venueId: string): CrawlStop | undefined {
  return stops.find((s) => s.venueId === venueId);
}

/** Adds the whole bar (all its deals), or removes it if it's already in the crawl. */
export function toggleVenue(stops: readonly CrawlStop[], venue: VenueRef): ToggleResult {
  if (find(stops, venue.id)) return { stops: stops.filter((s) => s.venueId !== venue.id), ok: true };
  if (stops.length >= MAX_CRAWL_STOPS) return { stops: [...stops], ok: false };
  return { stops: [...stops, { venueId: venue.id, dealIds: venue.deals.map((d) => d.id) }], ok: true };
}

/** Adds or removes one deal. Removing a bar's last selected deal removes the stop. */
export function toggleDeal(stops: readonly CrawlStop[], venue: VenueRef, dealId: string): ToggleResult {
  const stop = find(stops, venue.id);
  if (!stop) {
    if (stops.length >= MAX_CRAWL_STOPS) return { stops: [...stops], ok: false };
    return { stops: [...stops, { venueId: venue.id, dealIds: [dealId] }], ok: true };
  }
  const selected = stop.dealIds.includes(dealId);
  const dealIds = selected ? stop.dealIds.filter((id) => id !== dealId) : [...stop.dealIds, dealId];
  if (dealIds.length === 0) return { stops: stops.filter((s) => s.venueId !== venue.id), ok: true };
  return { stops: stops.map((s) => (s === stop ? { ...s, dealIds } : s)), ok: true };
}

export function removeVenue(stops: readonly CrawlStop[], venueId: string): CrawlStop[] {
  return stops.filter((s) => s.venueId !== venueId);
}

/**
 * The deals a stop is for, in the venue's own order. Deals that no longer exist (e.g. removed
 * after a data reload) are ignored; if none of the picked deals remain, falls back to all deals.
 */
export function selectedDeals<D extends { id: string }>(stop: CrawlStop, deals: readonly D[]): D[] {
  const picked = deals.filter((d) => stop.dealIds.includes(d.id));
  return picked.length > 0 ? picked : [...deals];
}

/** True when the stop covers every deal the venue has (shown as "whole bar" in the UI). */
export function isWholeVenue(stop: CrawlStop, deals: readonly { id: string }[]): boolean {
  return deals.every((d) => stop.dealIds.includes(d.id));
}

/** Reads stops saved as JSON, dropping anything malformed. Never throws. */
export function parseStops(json: string | null | undefined): CrawlStop[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    const stops: CrawlStop[] = [];
    for (const s of value) {
      if (typeof s !== 'object' || s === null) continue;
      const { venueId, dealIds } = s as { venueId?: unknown; dealIds?: unknown };
      if (typeof venueId !== 'string' || !Array.isArray(dealIds)) continue;
      if (stops.some((x) => x.venueId === venueId)) continue;
      stops.push({ venueId, dealIds: dealIds.filter((d): d is string => typeof d === 'string') });
    }
    return stops.slice(0, MAX_CRAWL_STOPS);
  } catch {
    return [];
  }
}
