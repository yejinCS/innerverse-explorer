// 디오라마 전용 상태 (카메라 모드 + 행성 톤). 감정/분기/말풍선은 emotionStore 재사용.
import { create } from "zustand";
import type { ToneKey } from "./constants";

export type CameraMode = "orbit" | "walk";

interface DioramaState {
  cameraMode: CameraMode;
  toneKey: ToneKey;
  setCameraMode: (m: CameraMode) => void;
  setTone: (k: ToneKey) => void;
}

const STORAGE_KEY = "innerverse.diorama";

interface Persisted {
  cameraMode: CameraMode;
  toneKey: ToneKey;
}

function load(): Persisted {
  const def: Persisted = { cameraMode: "orbit", toneKey: "cosmic" };
  if (typeof window === "undefined") return def;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    return { ...def, ...JSON.parse(raw) };
  } catch {
    return def;
  }
}

function save(s: Persisted) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const useDioramaStore = create<DioramaState>((set, get) => {
  const init = load();
  return {
    ...init,
    setCameraMode: (m) => {
      save({ cameraMode: m, toneKey: get().toneKey });
      set({ cameraMode: m });
    },
    setTone: (k) => {
      save({ cameraMode: get().cameraMode, toneKey: k });
      set({ toneKey: k });
    },
  };
});
