-- INNERVERSE 2.0 — Phase 2/3 보강: 공개 프로필 뷰 · 상담사 시드 · 코인 RPC
-- 0001_init.sql 적용 후 실행.

-- ─────────────────────────────────────────────────────────────
-- 공개 프로필 뷰 (소셜용) — 민감정보(email) 제외, nickname/성장단계만 노출.
-- users 본체는 self-only RLS 유지. 친구 닉네임 등은 이 뷰로만 읽는다.
-- ─────────────────────────────────────────────────────────────
create or replace view public.user_cards as
  select id, nickname, growth_stage
  from public.users;

grant select on public.user_cards to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 코인 차감 (원자적). 잔액 부족이면 예외. security definer 지만 auth.uid() 로 스코프됨.
-- 행성 방문·위로의 하트 등 C2C 결제에 사용.
-- ─────────────────────────────────────────────────────────────
create or replace function public.spend_coins(amount int, reason text default 'coin')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare bal int;
begin
  if amount < 0 then raise exception 'amount must be >= 0'; end if;
  select coins into bal from public.users where id = auth.uid() for update;
  if bal is null then raise exception 'profile not found'; end if;
  if bal < amount then raise exception 'insufficient coins'; end if;
  update public.users set coins = bal - amount where id = auth.uid();
  insert into public.transactions(user_id, amount, kind)
    values (auth.uid(), -amount, case when reason in ('coin','subscription','item') then reason else 'coin' end);
  return bal - amount;
end; $$;

grant execute on function public.spend_coins(int, text) to authenticated;

-- 코인 적립 (출석 보상 등)
create or replace function public.add_coins(amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare bal int;
begin
  update public.users set coins = coins + greatest(0, amount) where id = auth.uid()
    returning coins into bal;
  insert into public.transactions(user_id, amount, kind) values (auth.uid(), greatest(0, amount), 'coin');
  return bal;
end; $$;

grant execute on function public.add_coins(int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 상담사 / 정신과 시드 (counselors 는 인증 유저 공개읽기)
-- ⚠️ 데모 데이터. 실제 제휴 시 교체.
-- ─────────────────────────────────────────────────────────────
insert into public.counselors (name, specialty, type, rating, is_partner) values
  ('마음돌봄 심리상담센터', '불안·우울 · CBT',        'counselor',  4.8, true),
  ('서울온마음 정신건강의학과', '비대면 진료 · 약물상담', 'psychiatry', 4.7, true),
  ('연(緣) 상담연구소',      '대인관계 · 청년',        'counselor',  4.6, true),
  ('숲속정신건강의학과의원', '수면·번아웃',            'psychiatry', 4.5, false),
  ('토닥 EAP 상담',         '직장 스트레스 · EAP',     'counselor',  4.4, false)
on conflict do nothing;
