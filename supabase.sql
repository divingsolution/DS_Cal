-- Supabase SQL Editor에서 전체 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date not null,
  end_date date,
  category text not null check (category in ('국내투어','해외투어','교육','프로과정')),
  status text not null default '모집중' check (status in ('모집중','마감임박','마감')),
  location text default '',
  description text default '',
  detail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date >= start_date)
);

alter table public.events enable row level security;

drop policy if exists "Public can read events" on public.events;
create policy "Public can read events"
on public.events for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated admins can insert events" on public.events;
create policy "Authenticated admins can insert events"
on public.events for insert
to authenticated
with check (true);

drop policy if exists "Authenticated admins can update events" on public.events;
create policy "Authenticated admins can update events"
on public.events for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admins can delete events" on public.events;
create policy "Authenticated admins can delete events"
on public.events for delete
to authenticated
using (true);

-- 중요:
-- Authentication > Providers > Email에서 일반 사용자 Sign up을 꺼두세요.
-- Authentication > Users에서 관리자 계정만 직접 생성하세요.
