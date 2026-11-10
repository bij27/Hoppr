import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { confirmDeal, FeedbackError, fetchMyFeedbackToday, reportDeal } from '@/data/feedback';
import type { Deal, ReportReason } from '@/data/types';

type Outcome = { ok: true } | { ok: false; message: string };

type FeedbackState = {
  confirmedToday: (dealId: string) => boolean;
  reportedToday: (dealId: string) => boolean;
  /** Community confirmations including this person's, if they just confirmed. */
  confirmationsFor: (deal: Deal) => { count: number; lastAt: string | null };
  confirm: (dealId: string) => Promise<Outcome>;
  report: (dealId: string, reason: ReportReason, note: string) => Promise<Outcome>;
};

const FeedbackContext = createContext<FeedbackState | null>(null);

function failure(e: unknown): Outcome {
  return { ok: false, message: e instanceof FeedbackError ? e.message : 'Something went wrong. Try again.' };
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());
  const [reported, setReported] = useState<ReadonlySet<string>>(new Set());
  /** Confirmations made in this session that the venue list (loaded earlier) doesn't include yet. */
  const [fresh, setFresh] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetchMyFeedbackToday()
      .then(({ confirmed: c, reported: r }) => {
        if (cancelled) return;
        setConfirmed((prev) => new Set([...prev, ...c]));
        setReported((prev) => new Set([...prev, ...r]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const confirm = useCallback(async (dealId: string): Promise<Outcome> => {
    try {
      const result = await confirmDeal(dealId);
      setConfirmed((prev) => new Set(prev).add(dealId));
      if (result === 'ok') setFresh((prev) => new Map(prev).set(dealId, new Date().toISOString()));
      return { ok: true };
    } catch (e) {
      return failure(e);
    }
  }, []);

  const report = useCallback(async (dealId: string, reason: ReportReason, note: string): Promise<Outcome> => {
    try {
      await reportDeal(dealId, reason, note);
      setReported((prev) => new Set(prev).add(dealId));
      return { ok: true };
    } catch (e) {
      return failure(e);
    }
  }, []);

  const value = useMemo<FeedbackState>(
    () => ({
      confirmedToday: (id) => confirmed.has(id),
      reportedToday: (id) => reported.has(id),
      confirmationsFor: (deal) => {
        const count = deal.confirmCount7d ?? 0;
        const lastAt = deal.lastConfirmedAt ?? null;
        const mine = fresh.get(deal.id);
        // Skip once a reloaded venue list already includes it.
        const included = mine !== undefined && lastAt !== null && lastAt >= mine;
        return mine && !included ? { count: count + 1, lastAt: mine } : { count, lastAt };
      },
      confirm,
      report,
    }),
    [confirmed, reported, fresh, confirm, report],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackState {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}
