import type { Deal, DealCategory, MenuSection, Venue } from './types';

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
  menu?: unknown;
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
    menu: parseMenu(row.menu),
  };
}

/**
 * Menus are free-form JSON in the database, so keep only well-formed sections and items rather
 * than trusting the shape. Returns null when there's nothing usable.
 */
export function parseMenu(value: unknown): MenuSection[] | null {
  if (!Array.isArray(value)) return null;
  const sections: MenuSection[] = [];
  for (const s of value) {
    if (typeof s !== 'object' || s === null) continue;
    const { section, items } = s as { section?: unknown; items?: unknown };
    if (typeof section !== 'string' || !Array.isArray(items)) continue;
    const clean = items.filter(
      (i): i is { name: string; price: string } =>
        typeof i === 'object' && i !== null && typeof i.name === 'string' && typeof i.price === 'string',
    );
    if (clean.length > 0) sections.push({ section, items: clean.map(({ name, price }) => ({ name, price })) });
  }
  return sections.length > 0 ? sections : null;
}
