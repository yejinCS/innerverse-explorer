// Supabase 세션 ↔ userStore/diaryStore 브리지.
// 로그인/세션 복원 시 프로필을 userStore에 채우고 DB 일기를 불러온다.
// Supabase 미설정이면 아무것도 안 함(목업 모드 유지).
import { useEffect } from "react";
import { getSession, onAuthChange } from "@/services/auth";
import { getProfile } from "@/services/profileApi";
import { useUserStore } from "@/store/userStore";
import { useDiaryStore } from "@/store/diaryStore";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AuthBootstrap() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    const hydrate = async () => {
      try {
        const p = await getProfile();
        if (!active || !p) return;
        useUserStore.getState().hydrate({
          loggedIn: true,
          name: p.nickname ?? "이음",
          email: p.email ?? "",
          planetColor: p.planet_color,
          planetName: p.planet_name ?? `${p.nickname ?? "나"}의 행성`,
          level: p.level,
          streak: p.streak,
          stardust: p.stardust,
        });
        await useDiaryStore.getState().loadFromDb();
      } catch {
        /* ignore */
      }
    };

    getSession().then((s) => {
      if (s) hydrate();
    });

    const unsub = onAuthChange((user) => {
      if (user) hydrate();
      else useUserStore.getState().logout();
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  return null;
}
