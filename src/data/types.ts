import type { LatLng } from '@/lib/geo';
import type { DealSchedule } from '@/lib/time';

export type DealCategory = 'drinks' | 'food' | 'both';

export type Deal = DealSchedule & {
  id: string;
  venueId: string;
  title: string;
  details: string | null;
  category: DealCategory;
  /** ISO timestamp of the last time someone confirmed this deal in person. */
  lastVerifiedAt: string | null;
  /** Optional price list (e.g. a happy hour menu). */
  menu?: MenuSection[] | null;
};

export type MenuItem = { name: string; price: string };
export type MenuSection = { section: string; items: MenuItem[] };

export type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  location: LatLng;
  deals: Deal[];
};
