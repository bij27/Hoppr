/**
 * Bar crawl route planner.
 *
 * Happy hours are time windows, so the shortest walking route is often wrong: if Bar A's deal
 * ends at 6 and Bar B's starts at 7, order matters more than distance. Crawls are small
 * (<= MAX_CRAWL_STOPS), so we evaluate every ordering exactly and pick the best by:
 *   1. most stops where you actually catch a deal,
 *   2. most total minutes spent inside a deal window,
 *   3. least total walking.
 */
import { type LatLng, walkMinutes } from './geo';
import { activeMask, type DealSchedule, floorToMinute, MARKET_TZ } from './time';

export const MAX_CRAWL_STOPS = 8;
/** A stop "catches the deal" if at least this many minutes of the visit overlap a deal (or the whole visit, if shorter). */
export const MIN_DEAL_OVERLAP_MIN = 20;

const MS_PER_MINUTE = 60_000;

export type CrawlStopInput = {
  id: string;
  location: LatLng;
  schedules: readonly DealSchedule[];
};

export type PlanOptions = {
  start: Date;
  /** Minutes spent at each stop. */
  dwellMin: number;
  /** Where the group starts. If omitted, the first stop has no walk. */
  startLocation?: LatLng;
  tz?: string;
};

export type PlannedStop = {
  id: string;
  arrive: Date;
  leave: Date;
  /** Walk from the previous stop (or start location) in minutes. */
  walkMin: number;
  /** Minutes of this visit that fall inside a deal window. */
  dealMin: number;
  catchesDeal: boolean;
};

export type CrawlPlan = {
  stops: PlannedStop[];
  start: Date;
  end: Date;
  stopsWithDeal: number;
  totalDealMin: number;
  totalWalkMin: number;
};

type Score = { withDeal: number; dealMin: number; walkMin: number };

function isBetter(a: Score, b: Score): boolean {
  if (a.withDeal !== b.withDeal) return a.withDeal > b.withDeal;
  if (a.dealMin !== b.dealMin) return a.dealMin > b.dealMin;
  return a.walkMin < b.walkMin;
}

export function planCrawl(stops: readonly CrawlStopInput[], opts: PlanOptions): CrawlPlan {
  const { dwellMin } = opts;
  const tz = opts.tz ?? MARKET_TZ;
  const n = stops.length;

  if (!Number.isInteger(dwellMin) || dwellMin <= 0) {
    throw new RangeError('dwellMin must be a positive whole number of minutes');
  }
  if (n > MAX_CRAWL_STOPS) {
    throw new RangeError(`A crawl can have at most ${MAX_CRAWL_STOPS} stops`);
  }
  if (new Set(stops.map((s) => s.id)).size !== n) {
    throw new Error('Crawl stops must be unique');
  }

  const startMs = floorToMinute(opts.start.getTime());
  if (n === 0) {
    const d = new Date(startMs);
    return { stops: [], start: d, end: d, stopsWithDeal: 0, totalDealMin: 0, totalWalkMin: 0 };
  }

  // Walking times between every pair of stops, and from the start location.
  const walk: number[][] = stops.map((a) => stops.map((b) => walkMinutes(a.location, b.location)));
  const fromStart: number[] = stops.map((s) => (opts.startLocation ? walkMinutes(opts.startLocation, s.location) : 0));

  let maxTravel = Math.max(0, ...fromStart);
  for (const row of walk) maxTravel = Math.max(maxTravel, ...row);

  // Upper bound on how long any ordering can take, so every visit fits inside the mask.
  const horizon = n * (dwellMin + maxTravel);

  // prefix[i][m] = deal-active minutes at stop i during [0, m).
  const prefix: Int32Array[] = stops.map((s) => {
    const mask = activeMask(s.schedules, new Date(startMs), horizon, tz);
    const p = new Int32Array(horizon + 1);
    for (let m = 0; m < horizon; m++) p[m + 1] = p[m] + mask[m];
    return p;
  });

  const threshold = Math.min(dwellMin, MIN_DEAL_OVERLAP_MIN);
  const used = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  let bestOrder: number[] = [];
  let bestScore: Score | null = null;

  const search = (t: number, prev: number, score: Score) => {
    if (order.length === n) {
      if (bestScore === null || isBetter(score, bestScore)) {
        bestScore = score;
        bestOrder = order.slice();
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const travel = prev < 0 ? fromStart[i] : walk[prev][i];
      const arrive = t + travel;
      const leave = arrive + dwellMin;
      const overlap = prefix[i][leave] - prefix[i][arrive];
      used[i] = true;
      order.push(i);
      search(leave, i, {
        withDeal: score.withDeal + (overlap >= threshold ? 1 : 0),
        dealMin: score.dealMin + overlap,
        walkMin: score.walkMin + travel,
      });
      order.pop();
      used[i] = false;
    }
  };
  search(0, -1, { withDeal: 0, dealMin: 0, walkMin: 0 });

  // Rebuild the timeline for the winning order.
  const planned: PlannedStop[] = [];
  let t = 0;
  let prev = -1;
  let stopsWithDeal = 0;
  let totalDealMin = 0;
  let totalWalkMin = 0;
  for (const i of bestOrder) {
    const travel = prev < 0 ? fromStart[i] : walk[prev][i];
    const arrive = t + travel;
    const leave = arrive + dwellMin;
    const dealMin = prefix[i][leave] - prefix[i][arrive];
    const catchesDeal = dealMin >= threshold;
    planned.push({
      id: stops[i].id,
      arrive: new Date(startMs + arrive * MS_PER_MINUTE),
      leave: new Date(startMs + leave * MS_PER_MINUTE),
      walkMin: travel,
      dealMin,
      catchesDeal,
    });
    if (catchesDeal) stopsWithDeal++;
    totalDealMin += dealMin;
    totalWalkMin += travel;
    t = leave;
    prev = i;
  }

  return {
    stops: planned,
    start: new Date(startMs),
    end: new Date(startMs + t * MS_PER_MINUTE),
    stopsWithDeal,
    totalDealMin,
    totalWalkMin,
  };
}
