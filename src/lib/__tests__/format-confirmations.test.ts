import { describe, expect, it } from 'vitest';

import { formatConfirmations, formatRecent, isoDate } from '../format';

// 2026-11-10 is a Tuesday. 23:00 UTC = 6 PM in Fort Lauderdale (EST).
const now = new Date('2026-11-10T23:00:00Z');

describe('isoDate', () => {
  it('pads month and day', () => {
    expect(isoDate({ year: 2026, month: 3, day: 7 })).toBe('2026-03-07');
  });
});

describe('formatRecent', () => {
  it('uses today / yesterday / weekday in market time', () => {
    expect(formatRecent('2026-11-10T22:12:00Z', now)).toBe('today at 5:12 PM');
    expect(formatRecent('2026-11-10T02:00:00Z', now)).toBe('yesterday at 9:00 PM'); // still Nov 9 locally
    expect(formatRecent('2026-11-07T23:30:00Z', now)).toBe('Sat at 6:30 PM');
  });
});

describe('formatConfirmations', () => {
  it('returns null when nobody has confirmed', () => {
    expect(formatConfirmations(0, null, now)).toBeNull();
  });

  it('counts people and says when the last one was', () => {
    expect(formatConfirmations(1, '2026-11-10T22:12:00Z', now)).toBe('Confirmed by 1 person this week · last today at 5:12 PM');
    expect(formatConfirmations(4, null, now)).toBe('Confirmed by 4 people this week');
  });
});
