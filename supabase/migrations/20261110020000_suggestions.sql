-- "Suggest a bar or deal": anyone can send in a happy hour they found. Suggestions are private;
-- only the person who sent one and the admins can see it, and nothing reaches the app until an
-- admin adds it. Uses the same silent anonymous sign-in as confirmations and reports.
-- Limit: 5 suggestions per person per day (market time).

create type public.suggestion_status as enum ('pending', 'added', 'declined');

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Set when suggesting a deal at a bar already in the app; otherwise venue_name is required.
  venue_id uuid references public.venues (id) on delete set null,
  venue_name text check (venue_name is null or length(venue_name) between 2 and 120),
  venue_area text check (venue_area is null or length(venue_area) <= 160),
  deal text not null check (length(deal) between 3 and 300),
  when_text text check (when_text is null or length(when_text) <= 160),
  note text check (note is null or length(note) <= 500),
  status public.suggestion_status not null default 'pending',
  submitted_on date not null default (now() at time zone 'America/New_York')::date,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (venue_id is not null or venue_name is not null)
);

create index suggestions_pending_idx on public.suggestions (created_at desc) where status = 'pending';

alter table public.suggestions enable row level security;

-- How many suggestions the current user has sent today. Security definer so the insert policy
-- doesn't depend on the select policy.
create or replace function public.my_suggestions_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.suggestions
   where user_id = auth.uid()
     and submitted_on = (now() at time zone 'America/New_York')::date;
$$;

revoke all on function public.my_suggestions_today() from public;
grant execute on function public.my_suggestions_today() to authenticated;

create policy "Users send up to 5 suggestions a day"
  on public.suggestions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and submitted_on = (now() at time zone 'America/New_York')::date
    and (venue_id is null or exists (select 1 from public.venues v where v.id = venue_id and v.is_published))
    and public.my_suggestions_today() < 5
  );

create policy "Users see their own suggestions"
  on public.suggestions for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins manage suggestions"
  on public.suggestions for all
  using (public.is_admin())
  with check (public.is_admin());
