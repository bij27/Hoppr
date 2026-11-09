# Hoppr

Find live happy hours in Fort Lauderdale and plan a bar crawl that hits each one while it's on.
iOS, Android, and web from one Expo codebase.

## Run it

```bash
npm install
npm run web        # browser
npm start          # then scan the QR code with Expo Go on your phone
```

## Checks (run before every merge)

```bash
npm test           # unit tests: schedules, DST, overnight deals, crawl planner
npm run typecheck
npx expo lint
```

## Layout

| Path | What's there |
|---|---|
| `src/app/` | Screens (Expo Router). `(tabs)/index.tsx` = Deals, `(tabs)/crawl.tsx` = Crawl planner, `venue/[id].tsx` = venue page |
| `src/lib/` | Core logic, no UI. `time.ts` (timezone-aware deal windows), `crawl.ts` (route planner), `deals.ts`, `format.ts`, `geo.ts` |
| `src/data/` | Data access. `venues.ts` is the only place screens get venue data from |
| `src/state/` | App-wide state (loaded venues, current crawl) |
| `supabase/migrations/` | Database schema (Postgres + PostGIS) |

## How deal times work

Times are stored as the bar's local wall-clock minutes (`960` = 4 PM). A deal like
"Fri 11 PM – 2 AM" is stored on Friday with `start=1380, end=120`; the app treats an end at or
before the start as running past midnight. Daylight saving is handled; see `src/lib/__tests__/time.test.ts`.

## Data status

`src/data/fixtures.ts` holds **fictional sample bars** for development only. Real venues go into
the database once the Supabase project is set up.
