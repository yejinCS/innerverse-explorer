// 일기 목록 → 행성 위 구조물 배치 (deterministic).
// 일기 id를 해시 → (lat, lon, variation seed). 같은 일기는 항상 같은 자리에.
import type { DiaryEntry } from "@/store/diaryStore";
import { EMOTION_TO_STRUCTURE, emotionLabelToKey, type StructureType } from "./constants";

export interface PlacedStructure {
  id: string;
  type: StructureType;
  lat: number; // -PI*0.45 ~ PI*0.45
  lon: number; // 0 ~ 2PI
  seed: number; // variation 0~1
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function placeStructures(entries: DiaryEntry[]): PlacedStructure[] {
  return entries.map((e) => {
    const h = hash(e.id);
    const lat = ((h % 1000) / 1000 - 0.5) * Math.PI * 0.9;
    const lon = (((h >> 10) % 1000) / 1000) * Math.PI * 2;
    const seed = ((h >> 20) % 1000) / 1000;
    return {
      id: e.id,
      type: EMOTION_TO_STRUCTURE[emotionLabelToKey(e.primary)],
      lat,
      lon,
      seed,
    };
  });
}
