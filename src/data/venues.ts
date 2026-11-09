import { FIXTURE_VENUES } from './fixtures';
import type { Venue } from './types';

/**
 * Single entry point for venue data. Screens never import fixtures directly, so switching to
 * the Supabase backend only changes this function.
 */
export async function fetchVenues(): Promise<Venue[]> {
  return FIXTURE_VENUES;
}
