import type { Deal, DealCategory, Venue } from './types';

/** One row of the `get_venues()` database function (supabase/migrations/*_get_venues.sql). */
export type VenueRow = {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  deals: DealRow[] | null;
};

export type DealRow = {
  id: string;
  title: string;
  details: string | null;
  category: DealCategory;
  days: number[];
  start_minute: number;
  end_minute: number;
  last_verified_at: string | null;
};

export function venueFromRow(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    neighborhood: row.neighborhood,
    address: row.address,
    location: { lat: row.lat, lng: row.lng },
    deals: (row.deals ?? []).map((d) => dealFromRow(d, row.id)),
  };
}

function dealFromRow(row: DealRow, venueId: string): Deal {
  return {
    id: row.id,
    venueId,
    title: row.title,
    details: row.details,
    category: row.category,
    days: row.days,
    startMin: row.start_minute,
    endMin: row.end_minute,
    lastVerifiedAt: row.last_verified_at,
  };
}
