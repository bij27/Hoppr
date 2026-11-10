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
  /** Distinct people who confirmed this deal in the last 7 days ("Still on?" → Yes). */
  confirmCount7d?: number;
  /** ISO timestamp of the latest community confirmation (within the last 7 days). */
  lastConfirmedAt?: string | null;
};

export type ReportReason = 'wrong_price' | 'wrong_time' | 'no_longer_offered' | 'other';

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
