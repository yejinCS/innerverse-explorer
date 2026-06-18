-- INNERVERSE — RAG (장기 기억) : pgvector 의미검색
-- PPT 아키텍처 ②장기기억(일기=기억 1조각, pgvector 의미검색) 구현.
-- 0003_app.sql 적용 후 실행.

-- 1) pgvector 확장
create extension if not exists vector;

-- 2) 일기에 임베딩 컬럼 (Gemini text-embedding-004 = 768차원)
alter table public.diary_entries
  add column if not exists embedding vector(768);

-- 3) 의미검색 RPC — 내 일기 중 쿼리와 가장 가까운 top N.
--    sql/stable + invoker 권한 → diary_entries RLS(user_id=auth.uid())가 그대로 적용되어
--    남의 일기는 절대 검색되지 않음.
create or replace function public.match_diaries(
  query_embedding vector(768),
  match_count int default 3
)
returns table (id uuid, body text, primary_label text, date date, similarity float)
language sql
stable
as $$
  select
    d.id,
    d.body,
    d.primary_label,
    d.date,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.diary_entries d
  where d.user_id = auth.uid()
    and d.embedding is not null
  order by d.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

grant execute on function public.match_diaries(vector, int) to authenticated;

-- (선택) 임베딩 검색 인덱스 — 데이터 많아지면 성능↑. 적어도 무방.
-- create index if not exists diary_entries_embedding_idx
--   on public.diary_entries using ivfflat (embedding vector_cosine_ops) with (lists = 100);
