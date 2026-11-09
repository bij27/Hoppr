import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchVenues } from '@/data/venues';
import type { Venue } from '@/data/types';

type VenuesState = {
  venues: Venue[];
  byId: ReadonlyMap<string, Venue>;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const VenuesContext = createContext<VenuesState | null>(null);

export function VenuesProvider({ children }: { children: ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchVenues()
      .then((v) => {
        if (!cancelled) setVenues(v);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load venues');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRequestId((n) => n + 1);
  }, []);
  const value = useMemo<VenuesState>(
    () => ({ venues, byId: new Map(venues.map((v) => [v.id, v])), loading, error, reload }),
    [venues, loading, error, reload],
  );

  return <VenuesContext.Provider value={value}>{children}</VenuesContext.Provider>;
}

export function useVenues(): VenuesState {
  const ctx = useContext(VenuesContext);
  if (!ctx) throw new Error('useVenues must be used inside <VenuesProvider>');
  return ctx;
}
