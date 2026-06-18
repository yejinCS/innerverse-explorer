// 프로필 서비스 (Supabase profiles ↔ userStore)
import { getSupabase } from "@/lib/supabase";
import type { PlanetColor } from "@/store/userStore";

export interface ProfileRow {
  id: string;
  email: string | null;
  nickname: string | null;
  planet_color: PlanetColor;
  planet_name: string | null;
  level: number;
  streak: number;
  stardust: number;
}

export async function getProfile(): Promise<ProfileRow | null> {
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow) ?? null;
}

/** 닉네임/행성색 등 프로필 갱신 (없으면 생성). */
export async function saveProfile(p: {
  nickname?: string;
  planet_color?: PlanetColor;
  planet_name?: string;
}): Promise<void> {
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("로그인이 필요합니다.");
  const { error } = await sb
    .from("profiles")
    .upsert({ id: u.user.id, email: u.user.email, ...p }, { onConflict: "id" });
  if (error) throw error;
}
