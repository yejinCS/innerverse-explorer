-- INNERVERSE 2.0 — 초기 스키마 + RLS
-- 출처: BACKEND_AI_PLAN.md 2절. Supabase(Postgres) 기준.
-- 적용: supabase db push  /  또는 SQL editor 에 그대로 실행.
--
-- RLS 원칙(2절): 기본 user_id = auth.uid() 만 읽기/쓰기.
--   친구·방문 가능한 행성만 예외적 읽기. 일기 원문은 동의 통과 + 마스킹 후에만 집계.
-- 5감정 키(pos/calm/ten/sad/emp)는 절대 불변.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- updated_at 자동 갱신 트리거 함수
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ─────────────────────────────────────────────────────────────
-- 1) 유저 프로필  (auth.users 와 1:1)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  nickname      text,
  streak        int  not null default 0,
  growth_stage  int  not null default 1 check (growth_stage between 1 and 7), -- StageMomo
  plan          text not null default 'free' check (plan in ('free','premium')),
  consent_level int  not null default 100 check (consent_level in (0,70,100)), -- 데이터 개방 비율
  coins         int  not null default 0,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2) 일기 (멀티모달)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.diaries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  text       text,
  audio_url  text,
  photo_url  text,
  source     text not null default 'text' check (source in ('text','voice','photo')),
  input_meta jsonb,  -- {duration, typing_speed, paste_ratio, edit_count} ← 조작 검증
  created_at timestamptz not null default now()
);
create index if not exists diaries_user_idx on public.diaries(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 3) 감정 분석 결과 (5감정)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.emotion_analyses (
  id           uuid primary key default gen_random_uuid(),
  diary_id     uuid not null references public.diaries(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  pos int not null default 0 check (pos between 0 and 100),
  calm int not null default 0 check (calm between 0 and 100),
  ten int not null default 0 check (ten between 0 and 100),
  sad int not null default 0 check (sad between 0 and 100),
  emp int not null default 0 check (emp between 0 and 100),
  dominant     text check (dominant in ('bloom','calm','tense','wither','void')),
  keywords     jsonb,
  crisis_score float not null default 0,  -- 0~1 위기 신호
  created_at   timestamptz not null default now()
);
create index if not exists emo_user_idx on public.emotion_analyses(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 4) 행성 현재 상태
-- ─────────────────────────────────────────────────────────────
create table if not exists public.planets (
  user_id    uuid primary key references public.users(id) on delete cascade,
  branch     text check (branch in ('bloom','calm','tense','wither','void')),
  color      text,
  stage      int not null default 1,
  updated_at timestamptz not null default now()
);
create trigger planets_set_updated before update on public.planets
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5) 소셜
-- ─────────────────────────────────────────────────────────────
create table if not exists public.friends (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  friend_id  uuid not null references public.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

create table if not exists public.planet_visits (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  uuid not null references public.users(id) on delete cascade,
  host_id     uuid not null references public.users(id) on delete cascade,
  coins_spent int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.hearts (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.users(id) on delete cascade,
  to_user    uuid not null references public.users(id) on delete cascade,
  diary_id   uuid references public.diaries(id) on delete set null,
  kind       text,  -- 위로의 하트(유료 아이템) 종류
  created_at timestamptz not null default now()
);

create table if not exists public.exchange_diaries (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.users(id) on delete cascade,
  user_b     uuid not null references public.users(id) on delete cascade,
  diary_a    uuid references public.diaries(id) on delete set null,
  diary_b    uuid references public.diaries(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6) 케어 (닥터컨텍)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.crisis_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  diary_id   uuid references public.diaries(id) on delete set null,
  risk_score float not null default 0,
  signal     text,
  action     text check (action in ('escalated','dismissed')),  -- 사용자 선택
  created_at timestamptz not null default now()
);

create table if not exists public.counselors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  specialty  text,
  type       text check (type in ('counselor','psychiatry')),  -- 상담사|정신과
  rating     float,
  is_partner boolean not null default false
);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  counselor_id uuid references public.counselors(id) on delete set null,
  status       text not null default 'pending',
  scheduled_at timestamptz,
  fee          int,
  commission   int,  -- 중개 수수료 (B2B2C 캐시카우)
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 7) 결제 / 데이터 권한
-- ─────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  amount     int not null default 0,
  kind       text check (kind in ('coin','subscription','item')),
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  scope         text,
  granted       boolean not null default false,
  masking_level int not null default 0,
  updated_at    timestamptz not null default now()
);
create trigger consents_set_updated before update on public.consents
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8) 주간 리뷰
-- ─────────────────────────────────────────────────────────────
create table if not exists public.weekly_reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  week            date,
  summary         text,
  dominant        text check (dominant in ('bloom','calm','tense','wither','void')),
  recommendations jsonb,
  created_at      timestamptz not null default now()
);

-- ═════════════════════════════════════════════════════════════
-- RLS
-- ═════════════════════════════════════════════════════════════
alter table public.users            enable row level security;
alter table public.diaries          enable row level security;
alter table public.emotion_analyses enable row level security;
alter table public.planets          enable row level security;
alter table public.friends          enable row level security;
alter table public.planet_visits    enable row level security;
alter table public.hearts           enable row level security;
alter table public.exchange_diaries enable row level security;
alter table public.crisis_events    enable row level security;
alter table public.counselors       enable row level security;
alter table public.bookings         enable row level security;
alter table public.transactions     enable row level security;
alter table public.consents         enable row level security;
alter table public.weekly_reviews   enable row level security;

-- 본인 행만 (id = auth.uid())
create policy users_self on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

-- 본인 소유(user_id = auth.uid()) 전용 — 민감 데이터
create policy diaries_owner on public.diaries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy emo_owner on public.emotion_analyses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy crisis_owner on public.crisis_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bookings_owner on public.bookings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tx_owner on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_owner on public.consents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy weekly_owner on public.weekly_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 행성: 쓰기는 본인만, 읽기는 인증 유저 누구나(친구 방문 허용)
create policy planets_write on public.planets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy planets_read on public.planets
  for select using (auth.role() = 'authenticated');

-- 양자 관계 테이블: 당사자만
create policy friends_party on public.friends
  for all using (user_id = auth.uid() or friend_id = auth.uid())
  with check (user_id = auth.uid());
create policy visits_party on public.planet_visits
  for all using (visitor_id = auth.uid() or host_id = auth.uid())
  with check (visitor_id = auth.uid());
create policy hearts_party on public.hearts
  for all using (from_user = auth.uid() or to_user = auth.uid())
  with check (from_user = auth.uid());
create policy exchange_party on public.exchange_diaries
  for all using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- 상담사 목록: 인증 유저 읽기 전용 (쓰기는 서비스 롤로만)
create policy counselors_read on public.counselors
  for select using (auth.role() = 'authenticated');
