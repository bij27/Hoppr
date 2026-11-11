import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import type { DealTypeFilter } from '@/lib/feed';

type FiltersState = {
  tags: readonly string[];
  types: readonly DealTypeFilter[];
  count: number;
  toggleTag: (slug: string) => void;
  toggleType: (type: DealTypeFilter) => void;
  clear: () => void;
};

const FiltersContext = createContext<FiltersState | null>(null);

const toggle = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/**
 * Home-screen filters (events, deal types, bar features). Not saved between launches on purpose:
 * a forgotten filter would quietly hide bars.
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<readonly string[]>([]);
  const [types, setTypes] = useState<readonly DealTypeFilter[]>([]);

  const toggleTag = useCallback((slug: string) => setTags((prev) => toggle(prev, slug)), []);
  const toggleType = useCallback((type: DealTypeFilter) => setTypes((prev) => toggle(prev, type)), []);
  const clear = useCallback(() => {
    setTags([]);
    setTypes([]);
  }, []);

  const value = useMemo<FiltersState>(
    () => ({ tags, types, count: tags.length + types.length, toggleTag, toggleType, clear }),
    [tags, types, toggleTag, toggleType, clear],
  );
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersState {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used inside <FiltersProvider>');
  return ctx;
}
