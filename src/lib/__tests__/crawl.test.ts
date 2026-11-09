import { describe, expect, it } from 'vitest';

import { MAX_CRAWL_STOPS, planCrawl, type CrawlStopInput } from '../crawl';
import { walkMinutes } from '../geo';

const WEEKDAYS = [1, 2, 3, 4, 5];
// Mon Nov 9 2026, 5:00 PM EST
const MON_5PM = new Date('2026-11-09T22:00:00Z');

// Two spots ~100 m apart on Las Olas.
const A_LOC = { lat: 26.119, lng: -80.137 };
const B_LOC = { lat: 26.119, lng: -80.136 };

describe('planCrawl', () => {
  it('orders stops by deal windows, not input order', () => {
    const stops: CrawlStopInput[] = [
      { id: 'late', location: B_LOC, schedules: [{ days: WEEKDAYS, startMin: 18 * 60, endMin: 20 * 60 }] },
      { id: 'early', location: A_LOC, schedules: [{ days: WEEKDAYS, startMin: 16 * 60, endMin: 18 * 60 }] },
    ];
    const plan = planCrawl(stops, { start: MON_5PM, dwellMin: 60 });
    expect(plan.stops.map((s) => s.id)).toEqual(['early', 'late']);
    expect(plan.stopsWithDeal).toBe(2);
    expect(plan.stops[0].walkMin).toBe(0);
    expect(plan.stops[0].arrive.toISOString()).toBe('2026-11-09T22:00:00.000Z');
    expect(plan.stops[0].dealMin).toBe(60);
    const walk = walkMinutes(A_LOC, B_LOC);
    expect(plan.stops[1].walkMin).toBe(walk);
    expect(plan.stops[1].arrive.getTime()).toBe(MON_5PM.getTime() + (60 + walk) * 60_000);
    expect(plan.end.getTime()).toBe(MON_5PM.getTime() + (120 + walk) * 60_000);
    expect(plan.totalWalkMin).toBe(walk);
  });

  it('flags a stop whose deal is missed', () => {
    const stops: CrawlStopInput[] = [
      { id: 'over', location: A_LOC, schedules: [{ days: WEEKDAYS, startMin: 12 * 60, endMin: 14 * 60 }] },
    ];
    const plan = planCrawl(stops, { start: MON_5PM, dwellMin: 45 });
    expect(plan.stops[0].catchesDeal).toBe(false);
    expect(plan.stops[0].dealMin).toBe(0);
    expect(plan.stopsWithDeal).toBe(0);
  });

  it('uses walking distance as the tie-breaker', () => {
    const allDay = [{ days: [0, 1, 2, 3, 4, 5, 6], startMin: 0, endMin: 1440 }];
    const start = { lat: 26.119, lng: -80.14 };
    const near = { lat: 26.119, lng: -80.139 };
    const far = { lat: 26.119, lng: -80.13 };
    const plan = planCrawl(
      [
        { id: 'far', location: far, schedules: allDay },
        { id: 'near', location: near, schedules: allDay },
      ],
      { start: MON_5PM, dwellMin: 30, startLocation: start },
    );
    expect(plan.stops.map((s) => s.id)).toEqual(['near', 'far']);
  });

  it('counts a short visit fully inside a deal as catching it', () => {
    const plan = planCrawl(
      [{ id: 'a', location: A_LOC, schedules: [{ days: WEEKDAYS, startMin: 16 * 60, endMin: 19 * 60 }] }],
      { start: MON_5PM, dwellMin: 15 },
    );
    expect(plan.stops[0].catchesDeal).toBe(true);
  });

  it('handles an empty crawl', () => {
    const plan = planCrawl([], { start: MON_5PM, dwellMin: 45 });
    expect(plan.stops).toEqual([]);
    expect(plan.end.getTime()).toBe(MON_5PM.getTime());
  });

  it('plans the maximum number of stops quickly', () => {
    const stops: CrawlStopInput[] = Array.from({ length: MAX_CRAWL_STOPS }, (_, i) => ({
      id: `s${i}`,
      location: { lat: 26.11 + i * 0.002, lng: -80.14 + (i % 3) * 0.003 },
      schedules: [{ days: WEEKDAYS, startMin: 16 * 60 + i * 30, endMin: 18 * 60 + i * 30 }],
    }));
    const t0 = Date.now();
    const plan = planCrawl(stops, { start: MON_5PM, dwellMin: 30 });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(new Set(plan.stops.map((s) => s.id)).size).toBe(MAX_CRAWL_STOPS);
  });

  it('rejects invalid input', () => {
    const s: CrawlStopInput = { id: 'a', location: A_LOC, schedules: [] };
    expect(() => planCrawl([s, s], { start: MON_5PM, dwellMin: 30 })).toThrow();
    expect(() => planCrawl([s], { start: MON_5PM, dwellMin: 0 })).toThrow();
    expect(() => planCrawl([s], { start: MON_5PM, dwellMin: 1.5 })).toThrow();
    const many = Array.from({ length: MAX_CRAWL_STOPS + 1 }, (_, i) => ({ ...s, id: `x${i}` }));
    expect(() => planCrawl(many, { start: MON_5PM, dwellMin: 30 })).toThrow();
  });
});
