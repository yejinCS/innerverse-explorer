-- INNERVERSE 앱 — 인증 연동용 테이블 (profiles + diary_entries) + RLS
-- 앱 프론트의 userStore / diaryStore 데이터 모델에 1:1 대응.
-- Supabase SQL Editor 에 그대로 실행. (0001/0002 와 독립적으로 동작)

create extension if not exists "pgcrypto";

-- ── 프로필 (userStore 대응) ──
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  nickname     text,
  planet_color text default 'green' check (planet_color in ('green','purple','blue','amber','love','void')),
  planet_name  text,
  level        int  default 7,
  streak       int  default 0,
  stardust     int  default 132,
  created_at   timestamptz default now()
);

-- ── 일기 (diaryStore.DiaryEntry 대응) ──
create table if not exists public.diary_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date,
  preview       text,
  body          text,
  audio_sec     int  default 0,
  emotions      jsonb,          -- [{ "label": "차분", "pct": 48 }, ...]
  keywords      jsonb,          -- ["카페","휴식",...]
  primary_label text,           -- 'primary'는 예약어라 별칭 사용
  crisis_score  float default 0,
  created_at    timestamptz default now()
);
create index if not exists diary_entries_user_idx on public.diary_entries(user_id, created_at desc);

-- ── RLS: 본인 데이터만 ──
alter table public.profiles      enable row level security;
alter table public.diary_entries enable row level security;

create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy diary_owner on public.diary_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 가입 시 프로필 자동 생성 (auth.users insert → profiles)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nickname, planet_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nickname', '나') || '의 행성'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
