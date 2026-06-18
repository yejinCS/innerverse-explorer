// 배경 그라데이션 프리셋.
// 각 프리셋은 .iv-stage의 radial-gradient 문자열을 그대로 생성.
// preview는 BgPicker의 작은 썸네일에 쓰임 (같은 그라데이션을 축소 표현).

export type BgPresetKey =
  | "cosmic"
  | "aurora"
  | "dawn"
  | "dusk"
  | "void"
  | "lavender"
  | "forest"
  | "ember";

export interface BgPreset {
  key: BgPresetKey;
  label: string;
  // CSS background 값 (radial gradient)
  bg: string;
  // 썸네일 미리보기용 (간소화된 동일 톤)
  preview: string;
}

export const BG_PRESETS: BgPreset[] = [
  {
    key: "cosmic",
    label: "코스믹",
    bg: "radial-gradient(1200px 800px at 70% -10%, #1b1430, #0c0a16 55%, #07060d 100%)",
    preview: "radial-gradient(circle at 70% 0%, #1b1430, #0c0a16 60%, #07060d 100%)",
  },
  {
    key: "aurora",
    label: "오로라",
    bg: "radial-gradient(1200px 800px at 30% 10%, #0e3a4f, #122244 50%, #050816 100%)",
    preview: "radial-gradient(circle at 30% 10%, #0e3a4f, #122244 55%, #050816 100%)",
  },
  {
    key: "dawn",
    label: "새벽",
    bg: "radial-gradient(1200px 800px at 50% 110%, #4a2347, #1a1530 55%, #060410 100%)",
    preview: "radial-gradient(circle at 50% 100%, #4a2347, #1a1530 55%, #060410 100%)",
  },
  {
    key: "dusk",
    label: "황혼",
    bg: "radial-gradient(1200px 800px at 80% 0%, #3a1f4a, #1b0f2a 50%, #060410 100%)",
    preview: "radial-gradient(circle at 80% 0%, #3a1f4a, #1b0f2a 55%, #060410 100%)",
  },
  {
    key: "void",
    label: "공허",
    bg: "radial-gradient(1200px 800px at 50% 50%, #0d0a18, #06050c 60%, #000 100%)",
    preview: "radial-gradient(circle at 50% 50%, #0d0a18, #06050c 60%, #000 100%)",
  },
  {
    key: "lavender",
    label: "라벤더",
    bg: "radial-gradient(1200px 800px at 20% 20%, #3b2a6e, #1a1230 55%, #08060f 100%)",
    preview: "radial-gradient(circle at 20% 20%, #3b2a6e, #1a1230 55%, #08060f 100%)",
  },
  {
    key: "forest",
    label: "숲",
    bg: "radial-gradient(1200px 800px at 60% 100%, #0f3a2a, #0a1a20 55%, #050a0d 100%)",
    preview: "radial-gradient(circle at 60% 100%, #0f3a2a, #0a1a20 55%, #050a0d 100%)",
  },
  {
    key: "ember",
    label: "잿불",
    bg: "radial-gradient(1200px 800px at 40% 80%, #3a1410, #1a0a14 55%, #07050a 100%)",
    preview: "radial-gradient(circle at 40% 80%, #3a1410, #1a0a14 55%, #07050a 100%)",
  },
];

export const BG_PRESET_BY_KEY: Record<BgPresetKey, BgPreset> = BG_PRESETS.reduce(
  (acc, p) => {
    acc[p.key] = p;
    return acc;
  },
  {} as Record<BgPresetKey, BgPreset>,
);

// 커스텀 색에서 그라데이션 생성. 사용자는 3색을 직접 고를 수 있음.
export function customBg(c1: string, c2: string, c3: string): string {
  return `radial-gradient(1200px 800px at 70% -10%, ${c1}, ${c2} 55%, ${c3} 100%)`;
}

export const DEFAULT_CUSTOM_COLORS: [string, string, string] = ["#1b1430", "#0c0a16", "#07060d"];
