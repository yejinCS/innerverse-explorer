// 인증 서비스 (Supabase Auth) — 이메일/비밀번호.
import { getSupabase, maybeSupabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export async function signUpWithPassword(email: string, password: string, nickname?: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await maybeSupabase()?.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const c = maybeSupabase();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  const c = maybeSupabase();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}
