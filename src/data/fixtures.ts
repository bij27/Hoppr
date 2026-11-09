/**
 * DEVELOPMENT FIXTURES — FICTIONAL VENUES. NEVER SHIP THESE.
 *
 * Placeholder bars with made-up names and deals, placed roughly in real Fort Lauderdale
 * neighborhoods so the map, distances and crawl timing behave realistically during development.
 * Real venue data comes from the database once the team's scouted list is entered.
 */
import type { Venue } from './types';

const WEEKDAYS = [1, 2, 3, 4, 5];
const DAILY = [0, 1, 2, 3, 4, 5, 6];
const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const FIXTURE_VENUES: Venue[] = [
  {
    id: 'dev-salt-line',
    name: 'The Salt Line (sample)',
    neighborhood: 'Las Olas',
    address: 'Sample address — Las Olas Blvd',
    location: { lat: 26.1191, lng: -80.1366 },
    deals: [
      {
        id: 'dev-salt-line-1',
        venueId: 'dev-salt-line',
        title: '$5 house margaritas',
        details: 'Bar area only',
        category: 'drinks',
        days: WEEKDAYS,
        startMin: h(16),
        endMin: h(19),
        lastVerifiedAt: '2026-11-02T20:00:00Z',
      },
      {
        id: 'dev-salt-line-2',
        venueId: 'dev-salt-line',
        title: 'Half-price tacos',
        details: null,
        category: 'food',
        days: WEEKDAYS,
        startMin: h(16),
        endMin: h(18),
        lastVerifiedAt: '2026-11-02T20:00:00Z',
      },
    ],
  },
  {
    id: 'dev-copper-gull',
    name: 'Copper Gull Tavern (sample)',
    neighborhood: 'Las Olas',
    address: 'Sample address — SE 8th Ave',
    location: { lat: 26.1186, lng: -80.1340 },
    deals: [
      {
        id: 'dev-copper-gull-1',
        venueId: 'dev-copper-gull',
        title: '$4 drafts, $6 wells',
        details: null,
        category: 'drinks',
        days: DAILY,
        startMin: h(15),
        endMin: h(18),
        lastVerifiedAt: '2026-10-20T20:00:00Z',
      },
    ],
  },
  {
    id: 'dev-night-heron',
    name: 'Night Heron (sample)',
    neighborhood: 'Himmarshee',
    address: 'Sample address — SW 2nd St',
    location: { lat: 26.1197, lng: -80.1465 },
    deals: [
      {
        id: 'dev-night-heron-1',
        venueId: 'dev-night-heron',
        title: 'BOGO cocktails',
        details: 'Select menu',
        category: 'drinks',
        days: [3, 4, 5, 6],
        startMin: h(18),
        endMin: h(20),
        lastVerifiedAt: null,
      },
      {
        id: 'dev-night-heron-2',
        venueId: 'dev-night-heron',
        title: 'Reverse happy hour: $5 shots',
        details: null,
        category: 'drinks',
        days: [5, 6],
        startMin: h(23),
        endMin: h(2),
        lastVerifiedAt: '2026-11-07T04:00:00Z',
      },
    ],
  },
  {
    id: 'dev-brick-anchor',
    name: 'Brick & Anchor (sample)',
    neighborhood: 'Himmarshee',
    address: 'Sample address — SW 2nd St',
    location: { lat: 26.1194, lng: -80.1478 },
    deals: [
      {
        id: 'dev-brick-anchor-1',
        venueId: 'dev-brick-anchor',
        title: '$3 domestic bottles',
        details: null,
        category: 'drinks',
        days: WEEKDAYS,
        startMin: h(17),
        endMin: h(20),
        lastVerifiedAt: '2026-10-28T22:00:00Z',
      },
    ],
  },
  {
    id: 'dev-flagler-tap',
    name: 'Flagler Taproom (sample)',
    neighborhood: 'Flagler Village',
    address: 'Sample address — NE 4th Ave',
    location: { lat: 26.1305, lng: -80.1408 },
    deals: [
      {
        id: 'dev-flagler-tap-1',
        venueId: 'dev-flagler-tap',
        title: '$2 off all local drafts',
        details: null,
        category: 'drinks',
        days: DAILY,
        startMin: h(16),
        endMin: h(19),
        lastVerifiedAt: '2026-11-05T21:00:00Z',
      },
      {
        id: 'dev-flagler-tap-2',
        venueId: 'dev-flagler-tap',
        title: '$8 flatbreads',
        details: null,
        category: 'food',
        days: WEEKDAYS,
        startMin: h(16),
        endMin: h(19),
        lastVerifiedAt: '2026-11-05T21:00:00Z',
      },
    ],
  },
  {
    id: 'dev-dune-shack',
    name: 'Dune Shack (sample)',
    neighborhood: 'Beach / A1A',
    address: 'Sample address — N Fort Lauderdale Beach Blvd',
    location: { lat: 26.1228, lng: -80.1037 },
    deals: [
      {
        id: 'dev-dune-shack-1',
        venueId: 'dev-dune-shack',
        title: '$6 frozen drinks',
        details: 'Sunset deal',
        category: 'drinks',
        days: DAILY,
        startMin: h(17),
        endMin: h(19, 30),
        lastVerifiedAt: '2026-09-15T22:00:00Z',
      },
    ],
  },
];
