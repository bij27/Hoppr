-- Del Mar (Fort Lauderdale Beach). Already loaded on 2026-11-09; kept as a record.
-- Days: 0 = Sun ... 6 = Sat. Times: minutes after midnight (960 = 4 PM).

with venue as (
  insert into public.venues (slug, name, neighborhood, address, location, website, phone, is_published)
  values (
    'del-mar-fort-lauderdale',
    'Del Mar',
    'Fort Lauderdale Beach',
    '2200 N Ocean Blvd, Fort Lauderdale, FL 33305',
    extensions.st_point(-80.1007987456949, 26.15858136370662)::extensions.geography,
    'https://delmarmediterranean.com/locations-menus/fort-lauderdale/',
    '(754) 778-7188',
    true
  )
  returning id
)
insert into public.deals (venue_id, title, details, category, days, start_minute, end_minute, last_verified_at)
select venue.id, d.title, d.details, d.category::public.deal_category, d.days, d.start_minute, d.end_minute, now()
from venue, (values
  ('$3 off dips & spreads, $4 off starters, $5 off specialties', 'Bar area only', 'food',   '{1,2,3,4,5}'::smallint[], 960, 1080),
  ('$5 off signature cocktails, $3 off wine by the glass',       'Bar area only', 'drinks', '{1,2,3,4,5}'::smallint[], 960, 1080),
  ('Wine Enthusiast Wednesday: 50% off wine bottles',            'Bottles $100 and under', 'drinks', '{3}'::smallint[], 960, 1320),
  ('Half-off Veuve Clicquot bottles & glasses',                  'During weekend brunch',  'drinks', '{0,6}'::smallint[], 660, 900)
) as d(title, details, category, days, start_minute, end_minute);
