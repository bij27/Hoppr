import { describe, expect, it } from 'vitest';

import type { Deal, Venue } from '../../data/types';
import { type FeedQuery, viewVenue } from '../feed';

// Mon Nov 9 2026, 9:30 PM EST
const MON_930PM = new Date('2026-11-10T02:30:00Z');
const DAILY = [0, 1, 2, 3, 4, 5, 6];

function listing(id: string, extra: Partial<Deal>): Deal {
  return {
    id,
    venueId: 'v',
    title: id,
    details: null,
    category: 'drinks',
    days: DAILY,
    startMin: 16 * 60,
    endMin: 18 * 60,
    lastVerifiedAt: null,
    kind: 'deal',
    tags: [],
    ...extra,
  };
}

const venue = (deals: Deal[], tags: string[] = []): Venue => ({
  id: 'v',
  name: 'Bar',
  neighborhood: '',
  address: '',
  location: { lat: 0, lng: 0 },
  tags,
  deals,
});

const q = (time: FeedQuery['time'], tags: string[] = [], types: FeedQuery['types'] = []): FeedQuery => ({ time, tags, types });

// Happy hour is over at 9:30 PM; live music runs 9 PM to midnight.
const happyHour = listing('hh', {});
const liveMusic = listing('music', { kind: 'event', tags: ['live-music'], startMin: 21 * 60, endMin: 1440 });
const lateDeal = listing('late', { category: 'food', startMin: 21 * 60, endMin: 23 * 60 });
const karaokeLater = listing('karaoke', { kind: 'event', tags: ['karaoke'], startMin: 23 * 60, endMin: 1440 });

describe('viewVenue', () => {
  it('shows a bar with only a live event under Live now, with a badge and an ink pin', () => {
    const v = viewVenue(venue([happyHour, liveMusic]), MON_930PM, q('now'));
    expect(v).not.toBeNull();
    expect(v!.liveEvents.map((e) => e.id)).toEqual(['music']);
    expect(v!.tone).toBe('event');
    expect(v!.showStatus).toBe(false); // "nothing in the next 12 hrs" would contradict the badge
  });

  it('keeps the pin green when a deal is on, even with an event on too', () => {
    const v = viewVenue(venue([lateDeal, liveMusic]), MON_930PM, q('now'));
    expect(v!.tone).toBe('live');
    expect(v!.liveEvents).toHaveLength(1);
  });

  it('ranks live deals above bars with only a live event', () => {
    const deal = viewVenue(venue([lateDeal]), MON_930PM, q('now'))!;
    const event = viewVenue(venue([liveMusic]), MON_930PM, q('now'))!;
    expect(deal.rank).toBeLessThan(event.rank);
  });

  it('mentions an upcoming event when none is on', () => {
    const v = viewVenue(venue([happyHour, karaokeLater]), MON_930PM, q('soon'));
    expect(v!.nextEvent?.deal.id).toBe('karaoke');
    expect(v!.nextEvent?.startsInMin).toBe(90);
    expect(viewVenue(venue([happyHour, karaokeLater]), MON_930PM, q('now'))).toBeNull();
  });

  it('applies the time tab to the filtered event', () => {
    const bar = venue([lateDeal, karaokeLater]);
    expect(viewVenue(bar, MON_930PM, q('now', ['karaoke']))).toBeNull(); // deal is on, karaoke isn't
    expect(viewVenue(bar, MON_930PM, q('soon', ['karaoke']))?.headline?.id).toBe('karaoke');
  });

  it('filters by features (OR within the group) and by deal type', () => {
    const bar = venue([lateDeal], ['pool']);
    expect(viewVenue(bar, MON_930PM, q('all', ['pool', 'darts']))).not.toBeNull();
    expect(viewVenue(bar, MON_930PM, q('all', ['darts']))).toBeNull();
    expect(viewVenue(bar, MON_930PM, q('all', [], ['food']))).not.toBeNull();
    expect(viewVenue(bar, MON_930PM, q('all', [], ['drinks']))).toBeNull();
  });

  it('needs every group to match (AND across groups)', () => {
    const bar = venue([liveMusic], ['patio']);
    expect(viewVenue(bar, MON_930PM, q('all', ['live-music', 'patio']))).not.toBeNull();
    expect(viewVenue(bar, MON_930PM, q('all', ['live-music', 'pool']))).toBeNull();
  });

  it('filters brunch specials, and combines with deal types (brunch drink deals)', () => {
    const brunch = listing('brunch', { tags: ['brunch'], days: [0, 6], startMin: 11 * 60, endMin: 15 * 60 });
    const bar = venue([lateDeal, brunch]);
    expect(viewVenue(bar, MON_930PM, q('all', ['brunch']))?.headline?.id).toBe('brunch');
    expect(viewVenue(bar, MON_930PM, q('all', ['brunch'], ['drinks']))).not.toBeNull();
    expect(viewVenue(bar, MON_930PM, q('all', ['brunch'], ['food']))).toBeNull();
    expect(viewVenue(venue([lateDeal]), MON_930PM, q('all', ['brunch']))).toBeNull();
  });
});
