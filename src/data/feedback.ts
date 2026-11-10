import { isoDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { localDate } from '@/lib/time';

import { db as client, ensureUserId, UNIQUE_VIOLATION, UserFacingError as FeedbackError } from './session';
import type { ReportReason } from './types';

/** "ok" = recorded; "already" = this person already did it for this deal today. */
export type FeedbackResult = 'ok' | 'already';

export { UserFacingError as FeedbackError, backendEnabled as feedbackEnabled } from './session';

async function insertOnce(table: 'deal_confirmations' | 'deal_reports', row: Record<string, unknown>): Promise<FeedbackResult> {
  await ensureUserId();
  const { error } = await client().from(table).insert(row);
  if (!error) return 'ok';
  if (error.code === UNIQUE_VIOLATION) return 'already';
  throw new FeedbackError('Couldn’t send that. Check your connection and try again.');
}

/** "Still on?" → Yes. */
export function confirmDeal(dealId: string): Promise<FeedbackResult> {
  return insertOnce('deal_confirmations', { deal_id: dealId });
}

/** "Something's off". Goes to the admin inbox only. */
export function reportDeal(dealId: string, reason: ReportReason, note: string): Promise<FeedbackResult> {
  const trimmed = note.trim().slice(0, 500);
  return insertOnce('deal_reports', { deal_id: dealId, reason, note: trimmed || null });
}

/** Deal ids this person already confirmed or reported today. Empty if they've never signed in. */
export async function fetchMyFeedbackToday(): Promise<{ confirmed: string[]; reported: string[] }> {
  const empty = { confirmed: [], reported: [] };
  if (!supabase) return empty;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return empty;
  const today = isoDate(localDate(new Date()));
  const [c, r] = await Promise.all([
    supabase.from('deal_confirmations').select('deal_id').eq('confirmed_on', today),
    supabase.from('deal_reports').select('deal_id').eq('reported_on', today),
  ]);
  const ids = (rows: { deal_id: string }[] | null) => (rows ?? []).map((x) => x.deal_id);
  return { confirmed: ids(c.data), reported: ids(r.data) };
}
