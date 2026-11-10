-- Optional structured menu for a deal (e.g. a happy hour price list), shown as a price list in
-- the app instead of a paragraph of fine print.
--
-- Shape: [{ "section": "Drinks", "items": [{ "name": "Wine by the glass", "price": "$6.50" }] }]
-- Prices are text so they can say things like "$6 / $9".

alter table public.deals
  add column menu jsonb
    check (menu is null or jsonb_typeof(menu) = 'array');

-- Same as before, plus each deal's menu.
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
                  'last_verified_at', d.last_verified_at,
                  'menu', d.menu
                )
                order by d.start_minute, d.title)
         from public.deals d
        where d.venue_id = v.id and d.is_active),
      '[]'::jsonb) as deals
  from public.venues v
  where v.is_published
  order by v.name;
$$;
