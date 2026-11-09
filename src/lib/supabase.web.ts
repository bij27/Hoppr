// Web client. Pages are server-rendered first, where there is no browser storage, so sessions
// are only persisted once running in the browser (supabase-js then uses window.localStorage).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const inBrowser = typeof window !== 'undefined';

/** null when .env isn't filled in; the data layer then falls back to development fixtures. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: inBrowser,
          autoRefreshToken: inBrowser,
          detectSessionInUrl: inBrowser,
        },
      })
    : null;
