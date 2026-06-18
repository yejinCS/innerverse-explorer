-- INNERVERSE — 장기 기억 4계층 (PPT 765:852 구현)
-- ① 단기(대화)=비저장, ② 장기(일기+벡터)=0004, ③ 사실 요약, ④ 성향 요약
--   + 구조화된 사실/관계/시계열 지표.
-- 0003/0004 적용 후 실행.

-- ③④ 요약 (프로필에 한 단락씩 누적)
alter table public.profiles add column if not exists fact_summary text;     -- ③ 사실 요약
alter table public.profiles add column if not exists persona_summary text;  -- ④ 성향·패턴 요약

-- ③ 구조화된 사실 (직업·거주지·키 등)
create table if not exists public.user_facts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text default 'slow' check (kind in ('permanent', 'slow', 'tracked')),
  key             text not null,                 -- '직업','거주지','키' …
  value           text,
  confidence      float default 0.7,
  source_diary_id uuid references public.diary_entries(id) on delete set null,
  updated_at      timestamptz default now(),
  unique (user_id, key)
);

-- 관계 그래프 (사람별 노드)
create table if not exists public.relations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  relation       text,        -- 친구·상사·가족 …
  sentiment      text,        -- 긍정·중립·갈등 …
  note           text,
  last_mentioned timestamptz default now(),
  unique (user_id, name)
);

-- 시계열 지표 (키·몸무게·수면 …) — 추세 추적용
create table if not exists public.body_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date default current_date,
  kind       text,   -- 'weight'|'sleep'|'height' …
  value      float,
  created_at timestamptz default now()
);
create index if not exists body_metrics_user_idx on public.body_metrics(user_id, kind, date);

-- RLS: 본인 데이터만
alter table public.user_facts   enable row level security;
alter table public.relations    enable row level security;
alter table public.body_metrics enable row level security;

create policy user_facts_owner on public.user_facts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy relations_owner on public.relations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_metrics_owner on public.body_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
