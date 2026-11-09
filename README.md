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
| `src/app/` | Screens (Expo Router). `index.tsx` = map home with the pull-up list, `crawl.tsx` = crawl planner, `venue/[id].tsx` = venue page |
| `src/components/` | UI pieces. `map/` (react-native-maps on iOS/Android, Leaflet on web), `bottom-sheet.tsx` |
| `src/constants/theme.ts` | Design tokens ("ink & amber" colors, spacing, radius). Add colors here, not in screens |
| `src/lib/` | Core logic, no UI. `time.ts` (timezone-aware deal windows), `crawl.ts` (route planner), `feed.ts` (home filtering/ranking), `deals.ts`, `format.ts`, `geo.ts` |
| `src/data/` | Data access. `venues.ts` is the only place screens get venue data from |
| `src/state/` | App-wide state (loaded venues, current crawl) |
| `supabase/migrations/` | Database schema (Postgres + PostGIS) |

## How deal times work

Times are stored as the bar's local wall-clock minutes (`960` = 4 PM). A deal like
"Fri 11 PM – 2 AM" is stored on Friday with `start=1380, end=120`; the app treats an end at or
before the start as running past midnight. Daylight saving is handled; see `src/lib/__tests__/time.test.ts`.

## Data

The app reads venues from Supabase through the `get_venues()` database function
(`src/data/venues.ts` → `src/lib/supabase.ts`). Copy `.env.example` to `.env` and fill in the
project URL and publishable key.

In development, if the database has no published venues yet (or `.env` is missing), the app shows
the **fictional sample bars** in `src/data/fixtures.ts`. Production builds never show them.

Schema changes live in `supabase/migrations/`. Each new file must be run once against the
database, in filename order (currently by pasting it into the Supabase SQL Editor).

## Maps

- iOS uses Apple Maps and needs no key. Android uses Google Maps: it works in Expo Go, but store
  builds need a Google Maps API key (react-native-maps config plugin, `androidGoogleMapsApiKey`).
- Web uses Leaflet with OpenStreetMap's tile servers, tinted grayscale in CSS. That's fine for
  development, but OSM's servers aren't for app traffic: switch to a keyed tile provider
  (e.g. Stadia Maps or MapTiler) before a public launch.
