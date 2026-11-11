-- Tags for the bars already in the app. Requires migration 20261111000000_tags_and_events.sql.
-- Run once in the Supabase SQL Editor. (Del Mar's features are still to be filled in on the sheet.)

-- Kubo has a sports bar zone.
update public.venues set tags = '{sports}' where slug = 'kubo-asian-fusion-bar';

-- Kubo's Thursday ladies night.
update public.deals d
   set tags = '{ladies-night}'
  from public.venues v
 where v.id = d.venue_id
   and v.slug = 'kubo-asian-fusion-bar'
   and d.title = 'Ladies Night: free glass of wine or margarita';
