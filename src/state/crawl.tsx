import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';

import { readStoredValue, useStoredValue, writeStoredValue } from '@/hooks/use-stored-value';

import { MAX_CRAWL_STOPS } from '@/lib/crawl';
import { useVenues } from '@/state/venues';

import { type CrawlStop, parseStops, removeVenue, toggleDeal, toggleVenue, type VenueRef } from './crawl-stops';

/** The crawl being planned is saved on the device, so it survives closing the app. */
const STORAGE_KEY = 'hoppr.crawl.v1';


type CrawlState = {
  stops: readonly CrawlStop[];
  isFull: boolean;
  has: (venueId: string) => boolean;
  /** Selected deal ids for a venue, or undefined if the venue isn't in the crawl. */
  dealIdsFor: (venueId: string) => readonly string[] | undefined;
  /** Adds the whole bar or removes it. Returns false if the crawl is already full. */
  toggleVenue: (venue: VenueRef) => boolean;
  /** Adds or removes a single deal. Returns false if adding would need a new stop and the crawl is full. */
  toggleDeal: (venue: VenueRef, dealId: string) => boolean;
  remove: (venueId: string) => void;
  clear: () => void;
};

const CrawlContext = createContext<CrawlState | null>(null);

export function CrawlProvider({ children }: { children: ReactNode }) {
  const [saved] = useStoredValue(STORAGE_KEY);
  const { byId, loading, error } = useVenues();
  // Saved crawls can mention bars or deals that have since been removed: skip those once the
  // venue list is in (keep everything while it's loading or failed to load).
  const prune = useCallback(
    (parsed: CrawlStop[]): CrawlStop[] => {
      if (loading || error) return parsed;
      return parsed.flatMap((s) => {
        const venue = byId.get(s.venueId);
        if (!venue) return [];
        const dealIds = s.dealIds.filter((id) => venue.deals.some((d) => d.id === id));
        return [{ venueId: s.venueId, dealIds: dealIds.length > 0 ? dealIds : venue.deals.map((d) => d.id) }];
      });
    },
    [byId, loading, error],
  );
  const stops = useMemo(() => prune(parseStops(saved)), [prune, saved]);

  /** Applies a change to the latest saved stops (never a stale copy) and saves the result. */
  const setStops = useCallback(
    (update: (prev: CrawlStop[]) => CrawlStop[]) =>
      writeStoredValue(STORAGE_KEY, JSON.stringify(update(prune(parseStops(readStoredValue(STORAGE_KEY)))))),
    [prune],
  );

  const dealIdsFor = useCallback((id: string) => stops.find((s) => s.venueId === id)?.dealIds, [stops]);
  const has = useCallback((id: string) => stops.some((s) => s.venueId === id), [stops]);

  // Compute the result from current state to report ok/full synchronously, then apply the same
  // transition with an updater so rapid taps never act on stale state.
  const onToggleVenue = useCallback(
    (venue: VenueRef) => {
      const { ok } = toggleVenue(stops, venue);
      if (ok) setStops((prev) => toggleVenue(prev, venue).stops);
      return ok;
    },
    [stops, setStops],
  );

  const onToggleDeal = useCallback(
    (venue: VenueRef, dealId: string) => {
      const { ok } = toggleDeal(stops, venue, dealId);
      if (ok) setStops((prev) => toggleDeal(prev, venue, dealId).stops);
      return ok;
    },
    [stops, setStops],
  );

  const remove = useCallback((id: string) => setStops((prev) => removeVenue(prev, id)), [setStops]);
  const clear = useCallback(() => setStops(() => []), [setStops]);

  const value = useMemo<CrawlState>(
    () => ({
      stops,
      isFull: stops.length >= MAX_CRAWL_STOPS,
      has,
      dealIdsFor,
      toggleVenue: onToggleVenue,
      toggleDeal: onToggleDeal,
      remove,
      clear,
    }),
    [stops, has, dealIdsFor, onToggleVenue, onToggleDeal, remove, clear],
  );

  return <CrawlContext.Provider value={value}>{children}</CrawlContext.Provider>;
}

export function useCrawl(): CrawlState {
  const ctx = useContext(CrawlContext);
  if (!ctx) throw new Error('useCrawl must be used inside <CrawlProvider>');
  return ctx;
}
