# Scouting spreadsheet

One Google Sheet with three tabs, named exactly **Bars**, **Deals** and **Menus**. The three CSV
files in this folder are the starting tabs. Del Mar is filled in as an example; it's real data, so
importing it again just re-confirms Del Mar.

## Set up the Google Sheet (once)
1. Make a new Google Sheet called **Hoppr scouting**.
2. File → Import → Upload `Hoppr scouting - Bars.csv` → **Replace current sheet**. Rename the tab **Bars**.
3. File → Import → Upload `Hoppr scouting - Deals.csv` → **Insert new sheet(s)**. Rename it **Deals**.
4. Same for `Hoppr scouting - Menus.csv` → rename **Menus**.
5. Share it with your partner (Share → their email → Editor). Both of you can fill it in from the
   Google Sheets app while you're out.

## Bars tab: one row per bar
| Column | What to put | Example |
|---|---|---|
| name | The bar's name, as it should appear in the app | Kubo Asian Fusion & Bar |
| neighborhood | Area people know | Las Olas, 17th Street, Fort Lauderdale Beach |
| address | Full street address | 745 SE 17th St, Fort Lauderdale, FL 33316 |
| coordinates | In Google Maps, press and hold the bar's pin (right-click on desktop), then tap the numbers to copy them | 26.1011, -80.1355 |
| phone | Optional | (954) 533-9017 |
| website | Optional | https://… |
| publish | `yes` (or blank) shows it in the app; `no` keeps it hidden as a draft | yes |
| tags | What the bar always has, comma-separated (see the tag list below) | pool, darts, patio |
| notes | For you two only; never imported | Ask for manager Tues |

## Deals tab: one row per deal
| Column | What to put | Example |
|---|---|---|
| bar | Exactly the name from the Bars tab | Kubo Asian Fusion & Bar |
| deal | Short headline people scan, with the best prices first. Each deal at a bar needs a different name. | $5 drafts, $7 wells |
| details | Fine print: where it applies, exclusions | Bar only. Excludes premium. |
| type | `drinks`, `food` or `both` for a deal (blank = drinks); `event` for something on with no discount, like live music | both |
| days | `Daily`, `Weekdays`, `Weekends`, `Mon-Fri`, `Fri-Sun`, `Tue, Thu`… | Mon-Fri |
| start | When it starts | 4 PM |
| end | When it ends. Use `midnight` for 12 AM. Late-night deals can end after midnight, like `2 AM`. | 7 PM |
| tags | What kind of night it is, comma-separated (see the tag list below) | ladies night |
| notes | For you two only; never imported | |

"Until close" isn't a time; write the actual closing time for that day. If closing differs by day,
make one row per set of days (e.g. `Sun-Thu … midnight` and `Fri-Sat … 2 AM`) with slightly
different names.

### Events
Karaoke, live music, trivia and so on go on the Deals tab too, with **type** `event`, and they
use the same days, start and end. While an event is on, the app shows a badge next to the bar's
name ("Live music now") even if there's no deal. If an event *also* has a special (e.g. ladies
night with free wine), make it a normal deal with the tag instead.

| bar | deal | type | days | start | end | tags |
|---|---|---|---|---|---|---|
| The Wharf | Live music on the patio | event | Fri-Sat | 7 PM | 10 PM | live music |
| Kubo Asian Fusion & Bar | Ladies Night: free glass of wine or margarita | drinks | Thu | 4 PM | midnight | ladies night |

### Tag list
Tags come from one list shared with the app (`src/constants/tags.json`); ask Claude to add new ones.
Capitals don't matter, and common alternatives work ("pool table", "outdoor", "live band").

- **Bars tab (features):** pool, darts, patio, sports on TV, waterfront, rooftop, dog-friendly, games
- **Deals tab (events & nights):** karaoke, live music, trivia, DJ, drag show, comedy, ladies night, industry night, brunch (also "bottomless", "mimosas")

## Menus tab: optional price lists
For a deal with a long price list (like Kubo's happy hour). One row per item. The app shows these
as a "View menu" list under the deal.

| Column | Example |
|---|---|
| bar | Kubo Asian Fusion & Bar |
| deal | Exactly the deal name from the Deals tab |
| section | Beer |
| item | Draft, 14 oz |
| price | $6 |

## Import
1. In the Google Sheet, for each tab: File → Download → **Comma-separated values (.csv)**. Your
   computer saves them as `Hoppr scouting - Bars.csv`, `- Deals.csv` and `- Menus.csv`.
2. In the project folder run:
   ```
   npm run import-sheet -- ~/Downloads
   ```
   It picks the newest Bars/Deals/Menus files in that folder. If anything in the sheet can't be
   read, it lists each problem with its tab and row number; fix those and download again.
3. It writes a file like `supabase/venues/004_import_2026-11-12.sql`. Paste it into the Supabase
   SQL Editor and click Run.

Safe to re-run: bars are matched by name and deals by bar + deal name, so editing a row and
importing again updates it, and confirmations stay attached. Renaming a deal creates a new one. A
deal you delete from the sheet stays in the app, so turn it off in Supabase
(`update public.deals set is_active = false where title = '…';`).
