import { supabase } from '@/lib/supabase';

import { FIXTURE_VENUES } from './fixtures';
import { venueFromRow, type VenueRow } from './rows';
import type { Venue } from './types';

/**
 * Single entry point for venue data. Screens never import fixtures or Supabase directly.
 *
 * Development builds show the fictional fixtures while the database has no published venues
 * (or .env isn't set up). Production builds never show fixtures: no venues means an empty list.
 */
export async function fetchVenues(): Promise<Venue[]> {
  if (!supabase) {
    if (__DEV__) return FIXTURE_VENUES;
    throw new Error('Hoppr is not connected to its database.');
  }

  const { data, error } = await supabase.rpc('get_venues');
  if (error) throw new Error(error.message);

  const venues = ((data ?? []) as VenueRow[]).map(venueFromRow);
  if (venues.length === 0 && __DEV__) return FIXTURE_VENUES;
  return venues;
}
