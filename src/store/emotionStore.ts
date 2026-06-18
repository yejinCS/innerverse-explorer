// INNERVERSE 감정 상태 store
// 감정 누적 → decideBranch → 행성 분기 전환 + 배경 테마.
import { create } from "zustand";
import { BRANCH, COL, LINES, TALK_LINES, decideBranch, type BranchKey, type EmoKey } from "@/glass-momo/constants";
import {
  BG_PRESET_BY_KEY,
  customBg,
  DEFAULT_CUSTOM_COLORS,
  type BgPresetKey,
} from "@/glass-momo/bgPresets";

interface EmotionState {
  emo: Record<EmoKey, number>;
  branch: BranchKey;
  branchAmount: number;
  friendMode: boolean;

  // 트리거용 카운터: 변할 때마다 효과 1회 발생
  hopTick: number;
  burstTick: number;
  outcomeTick: number;
  speechTick: number;
  lastBurstEmo: EmoKey | null;
  lastBurstOrigin: "momo" | "friend";

  speech: string;
  outcomeShown: boolean;

  // 배경 테마
  bgMode: "preset" | "custom";
  bgPreset: BgPresetKey;
  bgCustom: [string, string, string];

  feed: (key: EmoKey) => void;
  talk: () => void;
  toggleFriend: (on?: boolean) => void;
  reset: () => void;
  say: (text: string) => void;
  hideOutcome: () => void;

  setBgPreset: (key: BgPresetKey) => void;
  setBgCustom: (idx: 0 | 1 | 2, color: string) => void;
  setBgMode: (mode: "preset" | "custom") => void;
}

// localStorage 영속화 — 첫 진입 시 저장된 배경 복원
const BG_STORAGE_KEY = "innerverse.bg";
type StoredBg = { mode: "preset" | "custom"; preset: BgPresetKey; custom: [string, string, string] };
function loadBg(): StoredBg {
  if (typeof window === "undefined") {
    return { mode: "preset", preset: "cosmic", custom: [...DEFAULT_CUSTOM_COLORS] };
  }
  try {
    const raw = window.localStorage.getItem(BG_STORAGE_KEY);
    if (!raw) throw new Error("none");
    const parsed = JSON.parse(raw) as StoredBg;
    if (!BG_PRESET_BY_KEY[parsed.preset]) throw new Error("invalid preset");
    return parsed;
  } catch {
    return { mode: "preset", preset: "cosmic", custom: [...DEFAULT_CUSTOM_COLORS] };
  }
}
function saveBg(s: StoredBg) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota/privacy mode 무시 */
  }
}

const initialEmo: Record<EmoKey, number> = { pos: 30, calm: 0, ten: 10, sad: 8, emp: 6 };

function applyBranch(emo: Record<EmoKey, number>) {
  const { key, amount } = decideBranch(emo);
  return { branch: key, branchAmount: amount };
}

export const useEmotionStore = create<EmotionState>((set, get) => {
  const init = applyBranch(initialEmo);
  const bg = loadBg();
  return {
    emo: { ...initialEmo },
    branch: init.branch,
    branchAmount: init.branchAmount,
    friendMode: false,

    hopTick: 0,
    burstTick: 0,
    outcomeTick: 0,
    speechTick: 0,
    lastBurstEmo: null,
    lastBurstOrigin: "momo",

    speech: "오늘 마음은 어때? 🌙",
    outcomeShown: false,

    bgMode: bg.mode,
    bgPreset: bg.preset,
    bgCustom: bg.custom,

    feed: (key) => {
      const emo = { ...get().emo };
      // 클릭한 감정만 크게 +, 나머지는 천천히 감쇠 → 지배 감정이 바뀌면 분기도 전환
      if (key === "pos") emo.pos += 14;
      else if (key === "calm") emo.calm += 12;
      else if (key === "ten") emo.ten += 16;
      else if (key === "sad") emo.sad += 16;
      else emo.emp += 16;

      const keys: EmoKey[] = ["pos", "calm", "ten", "sad", "emp"];
      keys.forEach((k) => {
        // pos↔calm 사이는 같은 긍정군이라 서로 감쇠 안 함
        const sameGroup = (key === "pos" && k === "calm") || (key === "calm" && k === "pos");
        if (k !== key && !sameGroup) emo[k] = emo[k] * 0.94;
      });

      const prevBranch = get().branch;
      const { branch, branchAmount } = applyBranch(emo);
      const branchChanged = prevBranch !== branch;

      const line = branchChanged ? "행성이 다른 모습으로 변하고 있어…" : LINES[key];

      set({
        emo,
        branch,
        branchAmount,
        hopTick: get().hopTick + 1,
        burstTick: get().burstTick + 1,
        lastBurstEmo: key,
        lastBurstOrigin: "momo",
        outcomeShown: true,
        outcomeTick: get().outcomeTick + 1,
        speech: line,
        speechTick: get().speechTick + 1,
      });
    },

    talk: () => {
      const line = TALK_LINES[Math.floor(Math.random() * TALK_LINES.length)];
      set({
        hopTick: get().hopTick + 1,
        speech: line,
        speechTick: get().speechTick + 1,
      });
    },

    toggleFriend: (on) => {
      const next = typeof on === "boolean" ? on : !get().friendMode;
      set({
        friendMode: next,
        speech: next ? "소연이가 놀러왔어 🌸" : "다시 우리 행성이야 🌙",
        speechTick: get().speechTick + 1,
      });
    },

    reset: () => {
      const emo: Record<EmoKey, number> = { pos: 8, calm: 0, ten: 4, sad: 4, emp: 4 };
      const { branch, branchAmount } = applyBranch(emo);
      set({
        emo,
        branch,
        branchAmount,
        speech: "마음을 비웠어. 다시 시작 🌱",
        speechTick: get().speechTick + 1,
        outcomeShown: false,
      });
    },

    say: (text) =>
      set({
        speech: text,
        speechTick: get().speechTick + 1,
      }),

    hideOutcome: () => set({ outcomeShown: false }),

    setBgPreset: (key) => {
      saveBg({ mode: "preset", preset: key, custom: get().bgCustom });
      set({ bgMode: "preset", bgPreset: key });
    },
    setBgCustom: (idx, color) => {
      const next = [...get().bgCustom] as [string, string, string];
      next[idx] = color;
      saveBg({ mode: "custom", preset: get().bgPreset, custom: next });
      set({ bgMode: "custom", bgCustom: next });
    },
    setBgMode: (mode) => {
      saveBg({ mode, preset: get().bgPreset, custom: get().bgCustom });
      set({ bgMode: mode });
    },
  };
});

// 현재 모드/프리셋/커스텀을 종합한 CSS background 값을 반환.
// 컴포넌트에서 selector로 구독해 인라인 스타일에 그대로 적용.
export function selectBackground(s: EmotionState): string {
  if (s.bgMode === "custom") return customBg(s.bgCustom[0], s.bgCustom[1], s.bgCustom[2]);
  return BG_PRESET_BY_KEY[s.bgPreset].bg;
}

// 외부에서 BRANCH/COL 다시 import 안 하도록 재노출 편의
export { BRANCH, COL, LINES };
export type { BranchKey, EmoKey };
