-- Beijing Winter Trip: run this once in Supabase → SQL Editor.
-- Login is Supabase Auth (email + password). Only people who joined with the trip code can read or change trip data.

-- ---------- members and the trip code ----------
create table if not exists public.members (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

-- Holds the sign-up code. RLS is on with no policies, so the API can never read it.
create table if not exists public.trip_secret (
  id int primary key default 1 check (id = 1),
  code text not null
);
alter table public.trip_secret enable row level security;
-- CHANGE THIS CODE before sharing it with your friends:
insert into public.trip_secret (id, code) values (1, 'BEIJING2026') on conflict (id) do nothing;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid())
$$;

create or replace function public.join_trip(p_code text, p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in first.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter your name.'; end if;
  if upper(trim(p_code)) is distinct from (select upper(code) from public.trip_secret where id = 1) then
    raise exception 'That trip code is wrong. Ask whoever set up the app for it.';
  end if;
  insert into public.members (user_id, name) values (auth.uid(), left(trim(p_name), 40))
  on conflict (user_id) do update set name = excluded.name;
end $$;

revoke all on function public.join_trip(text, text) from public, anon;
grant execute on function public.join_trip(text, text) to authenticated;
revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

-- ---------- trip data ----------
create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 140),
  who text not null default 'anyone',
  due text not null default '',
  tag text not null default 'Plan',
  note text not null default '',
  done boolean not null default false,
  done_by uuid,
  done_for jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create table if not exists public.expenses (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 80),
  amount numeric(12,2) not null check (amount > 0),
  cur text not null check (cur in ('CNY','SGD')),
  paid_by uuid not null,
  split jsonb not null default '[]'::jsonb,
  date text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create table if not exists public.settlements (
  id text primary key default gen_random_uuid()::text,
  from_id uuid not null,
  to_id uuid not null,
  sgd numeric(12,2) not null check (sgd > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.ideas (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 100),
  city text not null default '',
  when_text text not null default '',
  note text not null default '',
  link text not null default '',
  ord bigint not null default 0
);
create table if not exists public.days (
  date text primary key,
  city text not null default '',
  headline text not null default '' check (char_length(headline) <= 120),
  plan text not null default '' check (char_length(plan) <= 1200),
  area text not null default '' check (char_length(area) <= 120),
  food text not null default '' check (char_length(food) <= 1200)
);
alter table public.days add column if not exists area text not null default '';
alter table public.days add column if not exists food text not null default '';
create table if not exists public.settings (
  key text primary key,
  value text not null
);

-- ---------- access rules ----------
alter table public.members enable row level security;
drop policy if exists "members read" on public.members;
create policy "members read" on public.members for select to authenticated using (public.is_member() or user_id = auth.uid());
drop policy if exists "rename self" on public.members;
create policy "rename self" on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['tasks','expenses','settlements','ideas','days','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "trip members" on public.%I', t);
    execute format('create policy "trip members" on public.%I for all to authenticated using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;
