import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** Thrown with a message that's safe to show the user. */
export class UserFacingError extends Error {}

export const UNIQUE_VIOLATION = '23505';
export const RLS_VIOLATION = '42501';

/** Whether this build talks to the database (false when using development fixtures). */
export const backendEnabled = supabase !== null;

export function db(): SupabaseClient {
  if (!supabase) throw new UserFacingError('This isn’t available in this build.');
  return supabase;
}

/**
 * The current user's id. People who haven't signed in get a silent anonymous account the first
 * time they send something (confirm, report, suggest), never just for browsing. Later, signing in
 * with Apple or Google upgrades that same account, so their history carries over.
 */
export async function ensureUserId(): Promise<string> {
  const client = db();
  const { data } = await client.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await client.auth.signInAnonymously();
  if (error || !signedIn.user) throw new UserFacingError('Couldn’t connect right now. Try again in a moment.');
  return signedIn.user.id;
}
