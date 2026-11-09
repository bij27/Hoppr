import { describe, expect, it } from 'vitest';

import { featuredDeal, matchesFilter, pinTone } from '../feed';

const WEEKDAYS = [1, 2, 3, 4, 5];
// Mon Nov 9 2026, 5:00 PM EST
const MON_5PM = new Date('2026-11-09T22:00:00Z');

const early = { id: 'early', days: WEEKDAYS, startMin: 16 * 60, endMin: 18 * 60 };
const long = { id: 'long', days: WEEKDAYS, startMin: 16 * 60, endMin: 22 * 60 };
const later = { id: 'later', days: WEEKDAYS, startMin: 19 * 60, endMin: 21 * 60 };
const wed = { id: 'wed', days: [3], startMin: 16 * 60, endMin: 22 * 60 };

describe('featuredDeal', () => {
  it('prefers the live deal that runs longest', () => {
    expect(featuredDeal([early, later, long], MON_5PM)?.id).toBe('long');
  });

  it('falls back to the next deal to start, then the first listed', () => {
    expect(featuredDeal([wed, later], MON_5PM)?.id).toBe('later');
    expect(featuredDeal([wed], MON_5PM)?.id).toBe('wed');
    expect(featuredDeal([], MON_5PM)).toBeNull();
  });
});

describe('matchesFilter / pinTone', () => {
  it('classifies live, soon and idle', () => {
    expect(pinTone({ kind: 'active', endsInMin: 30 })).toBe('live');
    expect(pinTone({ kind: 'upcoming', startsInMin: 60 })).toBe('soon');
    expect(pinTone({ kind: 'upcoming', startsInMin: 600 })).toBe('idle');
    expect(pinTone({ kind: 'none' })).toBe('idle');
  });

  it('filters: "now" shows only live; "soon" adds deals starting within 4 hours', () => {
    const soon = { kind: 'upcoming', startsInMin: 120 } as const;
    expect(matchesFilter(soon, 'now')).toBe(false);
    expect(matchesFilter(soon, 'soon')).toBe(true);
    expect(matchesFilter({ kind: 'none' }, 'all')).toBe(true);
  });
});
