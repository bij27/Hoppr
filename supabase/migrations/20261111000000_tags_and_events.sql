-- Tags and events.
--   * venues.tags: features that are always true about a bar (pool, darts, patio...).
--   * deals.kind: 'deal' (a discount) or 'event' (karaoke, live music... possibly with no deal).
--     Events use the same days/start/end schedule as deals.
--   * deals.tags: what kind of night it is (karaoke, ladies-night...).
-- Tag slugs come from src/constants/tags.json; the app ignores unknown ones.
-- Requires 20261110010000_community_feedback.sql.

alter table public.venues
  add column tags text[] not null default '{}'
    check (cardinality(tags) <= 20 and array_to_string(tags, ',') ~ '^([a-z0-9-]+(,[a-z0-9-]+)*)?$');

alter table public.deals
  add column kind text not null default 'deal' check (kind in ('deal', 'event')),
  add column tags text[] not null default '{}'
    check (cardinality(tags) <= 10 and array_to_string(tags, ',') ~ '^([a-z0-9-]+(,[a-z0-9-]+)*)?$');

-- get_venues() gains a column (venue tags), so it has to be dropped and recreated.
drop function public.get_venues();

create function public.get_venues()
returns table (
  id uuid,
  slug text,
  name text,
  neighborhood text,
  address text,
  lat double precision,
  lng double precision,
  tags text[],
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
    v.tags,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', d.id,
                  'kind', d.kind,
                  'title', d.title,
                  'details', d.details,
                  'category', d.category,
                  'tags', d.tags,
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
