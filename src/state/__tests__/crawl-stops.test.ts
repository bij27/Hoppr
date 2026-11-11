import { describe, expect, it } from 'vitest';

import { MAX_CRAWL_STOPS } from '../../lib/crawl';
import { isWholeVenue, parseStops, selectedDeals, toggleDeal, toggleVenue, type CrawlStop, type VenueRef } from '../crawl-stops';

const delMar: VenueRef = { id: 'v1', deals: [{ id: 'hh-food' }, { id: 'hh-drinks' }, { id: 'wine-wed' }] };
const other: VenueRef = { id: 'v2', deals: [{ id: 'x' }] };

describe('toggleVenue', () => {
  it('adds a whole bar with all its deals, and removes it on the second toggle', () => {
    const added = toggleVenue([], delMar);
    expect(added).toEqual({ ok: true, stops: [{ venueId: 'v1', dealIds: ['hh-food', 'hh-drinks', 'wine-wed'] }] });
    expect(toggleVenue(added.stops, delMar)).toEqual({ ok: true, stops: [] });
  });

  it('refuses to add past the stop limit', () => {
    const full: CrawlStop[] = Array.from({ length: MAX_CRAWL_STOPS }, (_, i) => ({ venueId: `f${i}`, dealIds: [] }));
    expect(toggleVenue(full, delMar).ok).toBe(false);
  });
});

describe('toggleDeal', () => {
  it('adds a bar for just one deal', () => {
    expect(toggleDeal([], delMar, 'wine-wed').stops).toEqual([{ venueId: 'v1', dealIds: ['wine-wed'] }]);
  });

  it('adds and removes deals on an existing stop without disturbing other stops', () => {
    let stops = toggleDeal([], other, 'x').stops;
    stops = toggleDeal(stops, delMar, 'wine-wed').stops;
    stops = toggleDeal(stops, delMar, 'hh-drinks').stops;
    expect(stops).toEqual([
      { venueId: 'v2', dealIds: ['x'] },
      { venueId: 'v1', dealIds: ['wine-wed', 'hh-drinks'] },
    ]);
    stops = toggleDeal(stops, delMar, 'wine-wed').stops;
    expect(stops[1]).toEqual({ venueId: 'v1', dealIds: ['hh-drinks'] });
  });

  it('removes the stop when its last deal is deselected', () => {
    const stops = toggleDeal([], delMar, 'wine-wed').stops;
    expect(toggleDeal(stops, delMar, 'wine-wed').stops).toEqual([]);
  });

  it('narrows a whole-bar stop when one deal is deselected', () => {
    const stops = toggleVenue([], delMar).stops;
    expect(toggleDeal(stops, delMar, 'hh-food').stops).toEqual([{ venueId: 'v1', dealIds: ['hh-drinks', 'wine-wed'] }]);
  });

  it('refuses a new stop past the limit but still edits existing stops', () => {
    const full: CrawlStop[] = Array.from({ length: MAX_CRAWL_STOPS - 1 }, (_, i) => ({ venueId: `f${i}`, dealIds: [] }));
    const stops = toggleDeal(full, delMar, 'wine-wed').stops;
    expect(toggleDeal(stops, other, 'x').ok).toBe(false);
    expect(toggleDeal(stops, delMar, 'hh-food').ok).toBe(true);
  });
});

describe('selectedDeals / isWholeVenue', () => {
  it('returns picked deals in venue order', () => {
    const stop = { venueId: 'v1', dealIds: ['wine-wed', 'hh-food'] };
    expect(selectedDeals(stop, delMar.deals).map((d) => d.id)).toEqual(['hh-food', 'wine-wed']);
    expect(isWholeVenue(stop, delMar.deals)).toBe(false);
  });

  it('falls back to all deals if the picked ones no longer exist', () => {
    const stop = { venueId: 'v1', dealIds: ['gone'] };
    expect(selectedDeals(stop, delMar.deals)).toHaveLength(3);
  });
});

describe('parseStops', () => {
  it('reads saved stops and drops malformed or duplicate entries', () => {
    const saved = JSON.stringify([
      { venueId: 'a', dealIds: ['d1', 7] },
      { venueId: 'a', dealIds: [] },
      { venueId: 3, dealIds: [] },
      'junk',
      { venueId: 'b', dealIds: [] },
    ]);
    expect(parseStops(saved)).toEqual([
      { venueId: 'a', dealIds: ['d1'] },
      { venueId: 'b', dealIds: [] },
    ]);
  });

  it('returns no stops for missing or broken data', () => {
    expect(parseStops(null)).toEqual([]);
    expect(parseStops('{not json')).toEqual([]);
    expect(parseStops('{}')).toEqual([]);
  });
});
