-- Brunch tag for deals already in the app. Requires migration 20261111000000_tags_and_events.sql.
-- Run once in the Supabase SQL Editor.

-- Del Mar's weekend brunch Veuve deal.
update public.deals d
   set tags = array(select distinct unnest(d.tags || '{brunch}'::text[]))
  from public.venues v
 where v.id = d.venue_id
   and v.slug = 'del-mar-fort-lauderdale'
   and d.title = 'Half-off Veuve Clicquot bottles & glasses';
