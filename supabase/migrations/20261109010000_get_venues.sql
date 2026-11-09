-- The app's main read: every visible venue with plain lat/lng and its deals, in one round trip.
--
-- Runs with the caller's permissions (security invoker), so the RLS policies on venues and
-- deals still apply. It also filters to published venues and active deals itself, so admins
-- signed in to the app see exactly what the public sees (no drafts shown as live).
--
-- The app is single-market (src/lib/time.ts MARKET_TZ), so venues.timezone is not returned.

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
security invoker
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
                  'last_verified_at', d.last_verified_at
                )
                order by d.start_minute, d.title)
         from public.deals d
        where d.venue_id = v.id and d.is_active),
      '[]'::jsonb) as deals
  from public.venues v
  where v.is_published
  order by v.name;
$$;

revoke all on function public.get_venues() from public;
grant execute on function public.get_venues() to anon, authenticated;
