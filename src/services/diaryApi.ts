// 일기 영속화 서비스 (Supabase diary_entries ↔ diaryStore.DiaryEntry)
import { getSupabase } from "@/lib/supabase";
import { embed } from "@/lib/api";
import type { DiaryEntry } from "@/store/diaryStore";

interface DiaryRow {
  id: string;
  date: string;
  preview: string;
  body: string;
  audio_sec: number;
  emotions: DiaryEntry["emotions"];
  keywords: string[];
  primary_label: string;
  created_at: string;
}

function rowToEntry(r: DiaryRow): DiaryEntry {
  return {
    id: r.id,
    date: r.date ?? r.created_at?.slice(0, 10),
    preview: r.preview,
    body: r.body,
    audioSec: r.audio_sec ?? 0,
    emotions: r.emotions ?? [],
    keywords: r.keywords ?? [],
    primary: (r.primary_label as DiaryEntry["primary"]) ?? "차분",
  };
}

/** 일기 1건 DB 저장 → 저장된 엔트리(id 포함) 반환 */
export async function saveDiaryEntry(e: Omit<DiaryEntry, "id">): Promise<DiaryEntry> {
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("로그인이 필요합니다.");
  const { data, error } = await sb
    .from("diary_entries")
    .insert({
      user_id: u.user.id,
      date: e.date,
      preview: e.preview,
      body: e.body,
      audio_sec: e.audioSec,
      emotions: e.emotions,
      keywords: e.keywords,
      primary_label: e.primary,
    })
    .select("*")
    .single();
  if (error) throw error;
  const saved = rowToEntry(data as DiaryRow);
  // RAG: 임베딩 생성해 비동기 저장 (키 없으면 null → 스킵)
  void embed([saved.body, saved.keywords.join(" ")].join(" "))
    .then((vec) => {
      if (vec) return sb.from("diary_entries").update({ embedding: vec }).eq("id", saved.id);
    })
    .catch(() => {});
  return saved;
}

/** 내 일기 목록 (최신순) */
export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await sb
    .from("diary_entries")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as DiaryRow[]) ?? []).map(rowToEntry);
}
