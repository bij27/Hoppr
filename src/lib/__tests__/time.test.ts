import { describe, expect, it } from 'vitest';

import { activeMask, isScheduleActive, localTime, utcOffsetMinutes, validateSchedule } from '../time';

const WEEKDAYS = [1, 2, 3, 4, 5];

describe('localTime', () => {
  it('converts UTC instants to Fort Lauderdale wall time', () => {
    // Mon Nov 9 2026, 22:30 UTC = 5:30 PM EST
    expect(localTime(new Date('2026-11-09T22:30:00Z'))).toEqual({ day: 1, minute: 17 * 60 + 30 });
    // Mon Jul 13 2026, 22:30 UTC = 6:30 PM EDT
    expect(localTime(new Date('2026-07-13T22:30:00Z'))).toEqual({ day: 1, minute: 18 * 60 + 30 });
  });

  it('handles local midnight (day rolls over)', () => {
    // Tue Nov 10 2026 05:00 UTC = Tue 12:00 AM EST
    expect(localTime(new Date('2026-11-10T05:00:00Z'))).toEqual({ day: 2, minute: 0 });
  });
});

describe('utcOffsetMinutes', () => {
  it('reports EST and EDT', () => {
    expect(utcOffsetMinutes(new Date('2026-01-15T12:00:00Z'))).toBe(-300);
    expect(utcOffsetMinutes(new Date('2026-07-15T12:00:00Z'))).toBe(-240);
  });
});

describe('isScheduleActive', () => {
  const weekday4to7 = { days: WEEKDAYS, startMin: 16 * 60, endMin: 19 * 60 };

  it('is inclusive of start and exclusive of end', () => {
    expect(isScheduleActive(weekday4to7, { day: 1, minute: 16 * 60 })).toBe(true);
    expect(isScheduleActive(weekday4to7, { day: 1, minute: 19 * 60 - 1 })).toBe(true);
    expect(isScheduleActive(weekday4to7, { day: 1, minute: 19 * 60 })).toBe(false);
    expect(isScheduleActive(weekday4to7, { day: 1, minute: 16 * 60 - 1 })).toBe(false);
  });

  it('respects days', () => {
    expect(isScheduleActive(weekday4to7, { day: 6, minute: 17 * 60 })).toBe(false);
    expect(isScheduleActive(weekday4to7, { day: 0, minute: 17 * 60 })).toBe(false);
  });

  it('handles a window ending at midnight', () => {
    const lateNight = { days: [5], startMin: 22 * 60, endMin: 1440 };
    expect(isScheduleActive(lateNight, { day: 5, minute: 1439 })).toBe(true);
    expect(isScheduleActive(lateNight, { day: 6, minute: 0 })).toBe(false);
  });

  it('carries overnight windows into the next day only', () => {
    // Fri & Sat 10 PM – 2 AM
    const reverse = { days: [5, 6], startMin: 22 * 60, endMin: 2 * 60 };
    expect(isScheduleActive(reverse, { day: 5, minute: 23 * 60 })).toBe(true); // Fri 11 PM
    expect(isScheduleActive(reverse, { day: 6, minute: 60 })).toBe(true); // Sat 1 AM (from Fri)
    expect(isScheduleActive(reverse, { day: 0, minute: 60 })).toBe(true); // Sun 1 AM (from Sat)
    expect(isScheduleActive(reverse, { day: 5, minute: 60 })).toBe(false); // Fri 1 AM (Thu not listed)
    expect(isScheduleActive(reverse, { day: 6, minute: 2 * 60 })).toBe(false); // Sat 2 AM sharp
    expect(isScheduleActive(reverse, { day: 0, minute: 23 * 60 })).toBe(false); // Sun 11 PM
  });

  it('never treats start === end as active', () => {
    expect(isScheduleActive({ days: [1], startMin: 600, endMin: 600 }, { day: 1, minute: 600 })).toBe(false);
  });
});

describe('validateSchedule', () => {
  it('accepts valid schedules', () => {
    expect(validateSchedule({ days: WEEKDAYS, startMin: 960, endMin: 1140 })).toEqual([]);
    expect(validateSchedule({ days: [5], startMin: 1320, endMin: 120 })).toEqual([]);
  });
  it('rejects bad input', () => {
    expect(validateSchedule({ days: [], startMin: 960, endMin: 1140 })).not.toEqual([]);
    expect(validateSchedule({ days: [7], startMin: 960, endMin: 1140 })).not.toEqual([]);
    expect(validateSchedule({ days: [1, 1], startMin: 960, endMin: 1140 })).not.toEqual([]);
    expect(validateSchedule({ days: [1], startMin: 960, endMin: 960 })).not.toEqual([]);
    expect(validateSchedule({ days: [1], startMin: 1440, endMin: 60 })).not.toEqual([]);
    expect(validateSchedule({ days: [1], startMin: 0, endMin: 0 })).not.toEqual([]);
  });
});

describe('activeMask', () => {
  it('marks active minutes relative to start', () => {
    // Mon 3:50 PM EST; deal is weekdays 4–7 PM
    const mask = activeMask([{ days: WEEKDAYS, startMin: 960, endMin: 1140 }], new Date('2026-11-09T20:50:00Z'), 200);
    expect(mask[9]).toBe(0);
    expect(mask[10]).toBe(1); // 4:00 PM
    expect(mask[189]).toBe(1); // 6:59 PM
    expect(mask[190]).toBe(0); // 7:00 PM
  });

  it('floors the start to the minute', () => {
    const mask = activeMask([{ days: WEEKDAYS, startMin: 960, endMin: 1140 }], new Date('2026-11-09T20:59:59.999Z'), 2);
    expect(Array.from(mask)).toEqual([0, 1]);
  });

  it('stays correct across the spring-forward DST change', () => {
    // Sun Mar 14 2027: 2:00 AM EST jumps to 3:00 AM EDT. Start Sat 11:00 PM EST (04:00 UTC).
    // Deal: Sun 3 AM – 4 AM local. After the jump, 3 AM EDT = 07:00 UTC = 180 min after start.
    const mask = activeMask([{ days: [0], startMin: 180, endMin: 240 }], new Date('2027-03-14T04:00:00Z'), 300);
    expect(mask[179]).toBe(0);
    expect(mask[180]).toBe(1);
    expect(mask[239]).toBe(1);
    expect(mask[240]).toBe(0);
  });

  it('stays correct across the fall-back DST change', () => {
    // Sun Nov 7 2027: 2:00 AM EDT falls back to 1:00 AM EST. Start Sat 11:00 PM EDT (03:00 UTC).
    // Deal: Sun 2 AM – 3 AM local = 07:00–08:00 UTC = 240–300 min after start.
    const mask = activeMask([{ days: [0], startMin: 120, endMin: 180 }], new Date('2027-11-07T03:00:00Z'), 360);
    expect(mask[239]).toBe(0);
    expect(mask[240]).toBe(1);
    expect(mask[299]).toBe(1);
    expect(mask[300]).toBe(0);
  });

  it('returns an empty mask for no schedules', () => {
    expect(Array.from(activeMask([], new Date(), 5))).toEqual([0, 0, 0, 0, 0]);
  });
});
