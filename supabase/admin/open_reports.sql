-- Admin inbox, until it's built into the app. Paste into the Supabase SQL Editor and click Run.
-- Shows open reports, newest first, with how many people confirmed each deal this week.

select
  r.created_at at time zone 'America/New_York' as reported_at,
  v.name as venue,
  d.title as deal,
  r.reason,
  r.note,
  (select count(distinct dc.user_id) from public.deal_confirmations dc
    where dc.deal_id = d.id and dc.created_at > now() - interval '7 days') as confirmations_7d,
  r.id as report_id
from public.deal_reports r
join public.deals d on d.id = r.deal_id
join public.venues v on v.id = d.venue_id
where r.resolved_at is null
order by r.created_at desc;

-- When you've handled one, mark it resolved (paste its report_id):
--   update public.deal_reports set resolved_at = now() where id = '<report_id>';
--
-- If the deal is gone, turn it off so it disappears from the app:
--   update public.deals set is_active = false where id = (select deal_id from public.deal_reports where id = '<report_id>');
--
-- If you checked it in person and it's right, mark it verified:
--   update public.deals set last_verified_at = now() where id = (select deal_id from public.deal_reports where id = '<report_id>');
