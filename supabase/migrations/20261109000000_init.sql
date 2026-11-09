-- Hoppr initial schema
-- Venues, their happy hour deals, user reports of stale deals, and shareable crawls.
--
-- Deal times are venue-local wall-clock minutes (matches src/lib/time.ts):
--   start_minute 0–1439, end_minute 1–1440; end_minute <= start_minute means the window runs
--   past midnight and belongs to the day it STARTS on.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions; -- gen_random_bytes for share codes

-- ---------------------------------------------------------------------------
-- Admins (you + your partner). Only admins can create or edit venues and deals.
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies: only the service role (Supabase dashboard / SQL editor) can manage admins.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  neighborhood text not null default '',
  address text not null default '',
  location extensions.geography(point, 4326) not null,
  timezone text not null default 'America/New_York',
  google_place_id text unique,
  website text,
  phone text,
  -- Drafts stay hidden from the app until an admin publishes them.
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venues_location_idx on public.venues using gist (location);
create trigger venues_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

alter table public.venues enable row level security;

create policy "Published venues are public"
  on public.venues for select
  using (is_published or public.is_admin());

create policy "Admins manage venues"
  on public.venues for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------
create type public.deal_category as enum ('drinks', 'food', 'both');

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  details text,
  category public.deal_category not null default 'drinks',
  days smallint[] not null
    check (cardinality(days) between 1 and 7 and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  last_verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_window_not_empty check (start_minute <> end_minute)
);

-- Reject duplicate days like {1,1}; a CHECK constraint can't contain a subquery, so use a trigger.
create or replace function public.deals_validate_days()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(distinct d) from unnest(new.days) as d) <> cardinality(new.days) then
    raise exception 'deal days must not repeat' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger deals_validate_days before insert or update of days on public.deals
  for each row execute function public.deals_validate_days();

create index deals_venue_id_idx on public.deals (venue_id);
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

alter table public.deals enable row level security;

create policy "Active deals at published venues are public"
  on public.deals for select
  using (
    public.is_admin()
    or (
      is_active
      and exists (select 1 from public.venues v where v.id = venue_id and v.is_published)
    )
  );

create policy "Admins manage deals"
  on public.deals for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Deal reports ("this deal is wrong")
-- Signed-in users (including Supabase anonymous sign-ins) can report; only admins read.
-- ---------------------------------------------------------------------------
create type public.deal_report_reason as enum ('wrong_price', 'wrong_time', 'no_longer_offered', 'other');

create table public.deal_reports (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason public.deal_report_reason not null,
  note text check (note is null or length(note) <= 500),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index deal_reports_open_idx on public.deal_reports (deal_id) where resolved_at is null;

alter table public.deal_reports enable row level security;

create policy "Users file their own reports"
  on public.deal_reports for insert
  to authenticated
  with check (user_id = auth.uid() and resolved_at is null);

create policy "Admins read and resolve reports"
  on public.deal_reports for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Shared crawls. Not publicly listable: the only read path is get_crawl(share_code).
-- ---------------------------------------------------------------------------
create table public.crawls (
  id uuid primary key default gen_random_uuid(),
  -- Unguessable code used in share links (hoppr.app/c/<code>).
  share_code text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text check (title is null or length(title) <= 80),
  starts_at timestamptz not null,
  dwell_minutes smallint not null check (dwell_minutes between 5 and 240),
  created_at timestamptz not null default now()
);

create table public.crawl_stops (
  crawl_id uuid not null references public.crawls (id) on delete cascade,
  position smallint not null check (position between 0 and 7), -- matches MAX_CRAWL_STOPS = 8
  venue_id uuid not null references public.venues (id) on delete cascade,
  primary key (crawl_id, position),
  unique (crawl_id, venue_id)
);

alter table public.crawls enable row level security;
alter table public.crawl_stops enable row level security;

create policy "Owners manage their crawls"
  on public.crawls for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Owners manage their crawl stops"
  on public.crawl_stops for all
  to authenticated
  using (exists (select 1 from public.crawls c where c.id = crawl_id and c.created_by = auth.uid()))
  with check (exists (select 1 from public.crawls c where c.id = crawl_id and c.created_by = auth.uid()));

-- Anyone with the link can view a crawl (no sign-in), without being able to list all crawls.
create or replace function public.get_crawl(p_share_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'share_code', c.share_code,
    'title', c.title,
    'starts_at', c.starts_at,
    'dwell_minutes', c.dwell_minutes,
    'venue_ids', coalesce(
      (select jsonb_agg(s.venue_id order by s.position)
         from public.crawl_stops s
         join public.venues v on v.id = s.venue_id and v.is_published
        where s.crawl_id = c.id),
      '[]'::jsonb)
  )
  from public.crawls c
  where c.share_code = p_share_code;
$$;

revoke all on function public.get_crawl(text) from public;
grant execute on function public.get_crawl(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nearby venues for the app's main query.
-- Runs with the caller's permissions, so RLS still hides unpublished venues.
-- ---------------------------------------------------------------------------
create or replace function public.venues_near(p_lat double precision, p_lng double precision, p_radius_m double precision)
returns table (
  id uuid,
  name text,
  neighborhood text,
  address text,
  lat double precision,
  lng double precision,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    v.id,
    v.name,
    v.neighborhood,
    v.address,
    extensions.st_y(v.location::extensions.geometry) as lat,
    extensions.st_x(v.location::extensions.geometry) as lng,
    extensions.st_distance(v.location, extensions.st_point(p_lng, p_lat)::extensions.geography) as distance_m
  from public.venues v
  where extensions.st_dwithin(v.location, extensions.st_point(p_lng, p_lat)::extensions.geography, least(p_radius_m, 50000))
  order by distance_m;
$$;

grant execute on function public.venues_near(double precision, double precision, double precision) to anon, authenticated;
