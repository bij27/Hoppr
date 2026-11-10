-- Community feedback: "Still on?" confirmations and "Something's off" reports.
--
-- Anyone using the app can confirm or report. They get a silent Supabase anonymous sign-in, so
-- no account is needed. Limits:
--   * one confirmation and one report per person, per deal, per day (market time);
--   * only for active deals at published venues.
-- Reports go to the admin inbox only. Anonymous input never changes what the public sees;
-- an admin decides. Requires 20261110000000_deal_menus.sql.

-- ---------------------------------------------------------------------------
-- Confirmations
-- ---------------------------------------------------------------------------
create table public.deal_confirmations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  confirmed_on date not null default (now() at time zone 'America/New_York')::date,
  created_at timestamptz not null default now(),
  unique (deal_id, user_id, confirmed_on)
);

create index deal_confirmations_recent_idx on public.deal_confirmations (deal_id, created_at desc);

alter table public.deal_confirmations enable row level security;

create policy "Users confirm live listings once a day"
  on public.deal_confirmations for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and confirmed_on = (now() at time zone 'America/New_York')::date
    and exists (
      select 1 from public.deals d join public.venues v on v.id = d.venue_id
       where d.id = deal_id and d.is_active and v.is_published
    )
  );

create policy "Users see their own confirmations"
  on public.deal_confirmations for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins manage confirmations"
  on public.deal_confirmations for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Reports: one per person, per deal, per day; users can see their own.
-- ---------------------------------------------------------------------------
alter table public.deal_reports
  add column reported_on date not null default (now() at time zone 'America/New_York')::date;

alter table public.deal_reports
  add constraint deal_reports_once_a_day unique (deal_id, user_id, reported_on);

drop policy "Users file their own reports" on public.deal_reports;

create policy "Users report live listings once a day"
  on public.deal_reports for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and resolved_at is null
    and reported_on = (now() at time zone 'America/New_York')::date
    and exists (
      select 1 from public.deals d join public.venues v on v.id = d.venue_id
       where d.id = deal_id and d.is_active and v.is_published
    )
  );

create policy "Users see their own reports"
  on public.deal_reports for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- get_venues(): same as before, plus each deal's confirmation count for the last 7 days and
-- the time of its latest confirmation. Now security definer so it can count other people's
-- confirmations (it still returns only published venues and active deals, and no user ids).
-- ---------------------------------------------------------------------------
create or replace function public.get_venues()
returns table (
  id uuid,
  slug text,
  name text,
  neighborhood text,
  address text,
  lat double precision,
  lng double precision,
  deals jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.id,
    v.slug,
    v.name,
    v.neighborhood,
    v.address,
    extensions.st_y(v.location::extensions.geometry) as lat,
    extensions.st_x(v.location::extensions.geometry) as lng,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', d.id,
                  'title', d.title,
                  'details', d.details,
                  'category', d.category,
                  'days', d.days,
                  'start_minute', d.start_minute,
                  'end_minute', d.end_minute,
                  'last_verified_at', d.last_verified_at,
                  'menu', d.menu,
                  'confirm_count_7d', coalesce(c.people, 0),
                  'last_confirmed_at', c.last_at
                )
                order by d.start_minute, d.title)
         from public.deals d
         left join lateral (
           select count(distinct dc.user_id) as people, max(dc.created_at) as last_at
             from public.deal_confirmations dc
            where dc.deal_id = d.id and dc.created_at > now() - interval '7 days'
         ) c on true
        where d.venue_id = v.id and d.is_active),
      '[]'::jsonb) as deals
  from public.venues v
  where v.is_published
  order by v.name;
$$;

revoke all on function public.get_venues() from public;
grant execute on function public.get_venues() to anon, authenticated;
