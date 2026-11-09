import { describe, expect, it } from 'vitest';

import { dealStatus, statusLabel } from '../deals';
import { formatDays, formatDuration, formatMinuteOfDay, formatVerified } from '../format';

describe('formatMinuteOfDay', () => {
  it('formats 12-hour clock times', () => {
    expect(formatMinuteOfDay(0)).toBe('12 AM');
    expect(formatMinuteOfDay(1440)).toBe('12 AM');
    expect(formatMinuteOfDay(720)).toBe('12 PM');
    expect(formatMinuteOfDay(960)).toBe('4 PM');
    expect(formatMinuteOfDay(990)).toBe('4:30 PM');
    expect(formatMinuteOfDay(65)).toBe('1:05 AM');
  });
});

describe('formatDays', () => {
  it('summarizes common patterns', () => {
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe('Daily');
    expect(formatDays([1, 2, 3, 4, 5])).toBe('Mon–Fri');
    expect(formatDays([0, 6])).toBe('Weekends');
    expect(formatDays([5, 6, 0])).toBe('Fri–Sun');
    expect(formatDays([1, 3])).toBe('Mon, Wed');
    expect(formatDays([1, 2, 3, 5])).toBe('Mon–Wed, Fri');
    expect(formatDays([2])).toBe('Tue');
    expect(formatDays([])).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(135)).toBe('2 hr 15 min');
  });
});

describe('formatVerified', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  it('describes freshness', () => {
    expect(formatVerified(null, now)).toBe('Not yet verified');
    expect(formatVerified('2026-11-09T08:00:00Z', now)).toBe('Verified today');
    expect(formatVerified('2026-11-08T08:00:00Z', now)).toBe('Verified yesterday');
    expect(formatVerified('2026-11-01T12:00:00Z', now)).toBe('Verified 8 days ago');
    expect(formatVerified('2026-08-01T12:00:00Z', now)).toBe('Verified 3 months ago');
  });
});

describe('dealStatus', () => {
  const weekday4to7 = [{ days: [1, 2, 3, 4, 5], startMin: 960, endMin: 1140 }];
  it('reports active deals and minutes remaining', () => {
    // Mon 5:30 PM EST
    expect(dealStatus(weekday4to7, new Date('2026-11-09T22:30:00Z'))).toEqual({ kind: 'active', endsInMin: 90 });
  });
  it('reports upcoming deals', () => {
    // Mon 2:00 PM EST
    expect(dealStatus(weekday4to7, new Date('2026-11-09T19:00:00Z'))).toEqual({ kind: 'upcoming', startsInMin: 120 });
  });
  it('reports nothing outside the horizon', () => {
    // Sat 2:00 PM EST
    expect(dealStatus(weekday4to7, new Date('2026-11-14T19:00:00Z'))).toEqual({ kind: 'none' });
  });
});

describe('statusLabel', () => {
  // Intl may separate the time and AM/PM with a narrow no-break space; normalize for comparison.
  const label = (...args: Parameters<typeof statusLabel>) => statusLabel(...args).replace(/\s/g, ' ');
  const weekday4to7 = [{ days: [1, 2, 3, 4, 5], startMin: 960, endMin: 1140 }];

  it('labels live deals with their end time', () => {
    const now = new Date('2026-11-09T22:30:00Z'); // Mon 5:30 PM EST
    expect(label(dealStatus(weekday4to7, now), now)).toBe('Live until 7:00 PM');
  });

  it('labels same-day upcoming deals', () => {
    const now = new Date('2026-11-09T19:00:00Z'); // Mon 2:00 PM EST
    expect(label(dealStatus(weekday4to7, now), now)).toBe('Starts 4:00 PM');
  });

  it('says "tomorrow" when the next deal starts after midnight', () => {
    const morning = [{ days: [2], startMin: 7 * 60, endMin: 9 * 60 }]; // Tue 7–9 AM
    const now = new Date('2026-11-10T01:00:00Z'); // Mon 8:00 PM EST
    expect(label(dealStatus(morning, now), now)).toBe('Starts tomorrow 7:00 AM');
  });

  it('labels nothing upcoming', () => {
    const now = new Date('2026-11-14T19:00:00Z'); // Sat
    expect(label(dealStatus(weekday4to7, now), now)).toBe('Nothing in the next 12 hrs');
  });
});
