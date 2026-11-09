import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { MAX_CRAWL_STOPS } from '@/lib/crawl';

type CrawlState = {
  stopIds: readonly string[];
  isFull: boolean;
  has: (venueId: string) => boolean;
  /** Returns false if the crawl is already full. Adding an existing stop is a no-op that returns true. */
  add: (venueId: string) => boolean;
  remove: (venueId: string) => void;
  toggle: (venueId: string) => boolean;
  clear: () => void;
};

const CrawlContext = createContext<CrawlState | null>(null);

export function CrawlProvider({ children }: { children: ReactNode }) {
  const [stopIds, setStopIds] = useState<string[]>([]);

  const has = useCallback((id: string) => stopIds.includes(id), [stopIds]);

  const add = useCallback(
    (id: string) => {
      if (stopIds.includes(id)) return true;
      if (stopIds.length >= MAX_CRAWL_STOPS) return false;
      setStopIds((prev) => (prev.includes(id) || prev.length >= MAX_CRAWL_STOPS ? prev : [...prev, id]));
      return true;
    },
    [stopIds],
  );

  const remove = useCallback((id: string) => setStopIds((prev) => prev.filter((x) => x !== id)), []);

  const toggle = useCallback(
    (id: string) => {
      if (stopIds.includes(id)) {
        remove(id);
        return true;
      }
      return add(id);
    },
    [stopIds, add, remove],
  );

  const clear = useCallback(() => setStopIds([]), []);

  const value = useMemo<CrawlState>(
    () => ({ stopIds, isFull: stopIds.length >= MAX_CRAWL_STOPS, has, add, remove, toggle, clear }),
    [stopIds, has, add, remove, toggle, clear],
  );

  return <CrawlContext.Provider value={value}>{children}</CrawlContext.Provider>;
}

export function useCrawl(): CrawlState {
  const ctx = useContext(CrawlContext);
  if (!ctx) throw new Error('useCrawl must be used inside <CrawlProvider>');
  return ctx;
}
