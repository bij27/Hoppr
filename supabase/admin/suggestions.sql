-- Suggestion inbox, until it's built into the app. Paste into the Supabase SQL Editor and click Run.
-- Shows pending suggestions, newest first.

select
  s.created_at at time zone 'America/New_York' as sent_at,
  coalesce(v.name, s.venue_name) as bar,
  case when s.venue_id is null then 'NEW BAR' else 'existing bar' end as kind,
  s.venue_area as area,
  s.deal,
  s.when_text as "when",
  s.note,
  s.id as suggestion_id
from public.suggestions s
left join public.venues v on v.id = s.venue_id
where s.status = 'pending'
order by s.created_at desc;

-- Add a good one the usual way (send it to Claude, or write a supabase/venues/ file), then mark it:
--   update public.suggestions set status = 'added', reviewed_at = now() where id = '<suggestion_id>';
--
-- Not real, a duplicate, or can't verify:
--   update public.suggestions set status = 'declined', reviewed_at = now() where id = '<suggestion_id>';
