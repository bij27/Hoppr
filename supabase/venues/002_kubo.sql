-- Kubo Asian Fusion & Bar. Run once in the Supabase SQL Editor.
-- Days: 0 = Sun ... 6 = Sat. Times: minutes after midnight (960 = 4 PM, 1440 = midnight close).
-- Kubo closes at midnight every day, so "until close" = 1440.

with venue as (
  insert into public.venues (slug, name, neighborhood, address, location, phone, is_published)
  values (
    'kubo-asian-fusion-bar',
    'Kubo Asian Fusion & Bar',
    '17th Street',
    '745 SE 17th St, Fort Lauderdale, FL 33316',
    extensions.st_point(-80.13548166158964, 26.101123858043447)::extensions.geography,
    '(954) 533-9017',
    true
  )
  returning id
)
insert into public.deals (venue_id, title, details, category, days, start_minute, end_minute, last_verified_at)
select venue.id, d.title, d.details, d.category::public.deal_category, d.days, d.start_minute, d.end_minute, now()
from venue, (values
  -- Everyday happy hour (same menu for all three windows)
  ('Happy hour: $6.50 wine, $10.50 cocktails, apps from $4.95',
   'Any table. Drinks: classic cocktails & house martini $10.50, wine $6.50, prosecco $10, yuzu highball $12, mixed drinks $8.50, draft $6 (14 oz) / $9 (22 oz), bottles $5, 6-bottle bucket $29, beer tower $50, sake or soju bomb for 2 $10, soju flight $12, cold sake $10. Food: edamame from $4.95, dumplings, gyoza & crab rangoon $6.95, karaage & yakitori $9.95, truffle fries $8.95, 6 oysters $13.95, sushi or sashimi app $15.95.',
   'both', '{0,1,2,3,4,5,6}'::smallint[], 960, 1080),
  ('Happy hour at the bar & high tops',
   'Same happy hour menu, an hour longer when you sit at the bar or a high top.',
   'both', '{0,1,2,3,4,5,6}'::smallint[], 960, 1140),
  ('Late-night happy hour',
   'Sports bar zone only. Happy hour menu.',
   'both', '{0,1,2,3,4,5,6}'::smallint[], 1350, 1440),

  -- Daily specials, 4 PM to close, Sunday to Thursday
  ('Oyster Monday: second glass of house wine free',
   'With a dozen oysters and a glass of house wine at full price, the second glass is free. Excludes Kumamoto oysters.',
   'both', '{1}'::smallint[], 960, 1440),
  ('BOGO margaritas, mojitos & martinis',
   'Classic margarita, mojito, lychee or key lime martini. Bar only.',
   'drinks', '{2}'::smallint[], 960, 1440),
  ('Sweet Time Wednesday: free sake or wine with a boat for 2',
   'Order a boat for 2 and get a carafe of hot sake or 2 glasses of house wine.',
   'both', '{3}'::smallint[], 960, 1440),
  ('Ladies Night: free glass of wine or margarita',
   'For ladies at the bar (full bar only). House wine or classic margarita.',
   'drinks', '{4}'::smallint[], 960, 1440),
  ('Cold sake: second 200 ml bottle 50% off',
   'Any table.',
   'drinks', '{4}'::smallint[], 960, 1440),
  ('Beer Lover Sunday: BOGO bottles & drafts',
   'Full bar only.',
   'drinks', '{0}'::smallint[], 960, 1440),
  ('Beer towers & yuzu highballs: buy one, get one 50% off',
   'Any table.',
   'drinks', '{0}'::smallint[], 960, 1440)
) as d(title, details, category, days, start_minute, end_minute);
