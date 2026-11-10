import { describe, expect, it } from 'vitest';

import { parseMenu, venueFromRow, type VenueRow } from '../rows';

const row: VenueRow = {
  id: 'v1',
  slug: 'example-bar',
  name: 'Example Bar',
  neighborhood: 'Las Olas',
  address: '123 E Las Olas Blvd',
  lat: 26.1191,
  lng: -80.1366,
  deals: [
    {
      id: 'd1',
      title: '$5 margaritas',
      details: null,
      category: 'drinks',
      days: [5],
      start_minute: 1380,
      end_minute: 120,
      last_verified_at: '2026-11-02T20:00:00Z',
    },
  ],
};

describe('venueFromRow', () => {
  it('maps database names to app names and attaches the venue id to each deal', () => {
    expect(venueFromRow(row)).toEqual({
      id: 'v1',
      name: 'Example Bar',
      neighborhood: 'Las Olas',
      address: '123 E Las Olas Blvd',
      location: { lat: 26.1191, lng: -80.1366 },
      deals: [
        {
          id: 'd1',
          venueId: 'v1',
          title: '$5 margaritas',
          details: null,
          category: 'drinks',
          days: [5],
          startMin: 1380,
          endMin: 120,
          lastVerifiedAt: '2026-11-02T20:00:00Z',
          menu: null,
          confirmCount7d: 0,
          lastConfirmedAt: null,
        },
      ],
    });
  });

  it('treats missing deals as none', () => {
    expect(venueFromRow({ ...row, deals: null }).deals).toEqual([]);
  });
});

describe('parseMenu', () => {
  it('keeps well-formed sections and items', () => {
    const menu = [{ section: 'Beer', items: [{ name: 'Draft, 14 oz', price: '$6' }] }];
    expect(parseMenu(menu)).toEqual(menu);
  });

  it('drops malformed items and empty sections instead of crashing', () => {
    expect(
      parseMenu([
        { section: 'Beer', items: [{ name: 'Draft', price: 6 }, null, { name: 'Bottle', price: '$5' }] },
        { section: 'Empty', items: [] },
        'junk',
      ]),
    ).toEqual([{ section: 'Beer', items: [{ name: 'Bottle', price: '$5' }] }]);
    expect(parseMenu(null)).toBeNull();
    expect(parseMenu({})).toBeNull();
  });
});
