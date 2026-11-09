import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { MAX_CRAWL_STOPS } from '@/lib/crawl';

import { type CrawlStop, removeVenue, toggleDeal, toggleVenue, type VenueRef } from './crawl-stops';

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
  const [stops, setStops] = useState<CrawlStop[]>([]);

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
    [stops],
  );

  const onToggleDeal = useCallback(
    (venue: VenueRef, dealId: string) => {
      const { ok } = toggleDeal(stops, venue, dealId);
      if (ok) setStops((prev) => toggleDeal(prev, venue, dealId).stops);
      return ok;
    },
    [stops],
  );

  const remove = useCallback((id: string) => setStops((prev) => removeVenue(prev, id)), []);
  const clear = useCallback(() => setStops([]), []);

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
