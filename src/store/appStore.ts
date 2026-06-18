// 친구/알림/퀘스트/출석/인벤토리/설정 목업 통합 store.
// 화면이 많으니 한 곳에서 관리. 실제 백엔드 없이 in-memory + 일부 영속화.
import { create } from "zustand";

export interface Friend {
  id: string;
  name: string;
  planetColor: "green" | "purple" | "blue" | "amber" | "love" | "void";
  similarity: number; // 0~100
  code: string;
  lastEmotion: string;
}

export interface NotificationItem {
  id: string;
  type: "letter" | "attendance" | "friend" | "review";
  title: string;
  body: string;
  time: string; // 표시용
  unread: boolean;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  reward: number;
  done: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji: string;
  category: "deco" | "weather" | "creature";
  owned: boolean;
  price: number;
}

interface Settings {
  notifPush: boolean;
  notifLetter: boolean;
  notifFriend: boolean;
  weekStart: "mon" | "sun";
  theme: "dark";
}

const FRIENDS: Friend[] = [
  { id: "f1", name: "소연", planetColor: "love", similarity: 78, code: "SOYEON-2210", lastEmotion: "차분" },
  { id: "f2", name: "지훈", planetColor: "blue", similarity: 64, code: "JIHUN-1099", lastEmotion: "긴장" },
  { id: "f3", name: "민서", planetColor: "amber", similarity: 52, code: "MINSEO-7341", lastEmotion: "기쁨" },
];

const NOTIFS: NotificationItem[] = [
  { id: "n1", type: "letter", title: "과거의 편지가 도착했어요", body: "3개월 전 오늘의 너에게.", time: "3분 전", unread: true },
  { id: "n2", type: "friend", title: "소연이 행성을 방문했어요", body: "감정 닮음 78%", time: "1시간 전", unread: true },
  { id: "n3", type: "attendance", title: "13일 연속 기록 중!", body: "내일도 함께해요 🌙", time: "오늘", unread: false },
  { id: "n4", type: "review", title: "이번 주 리뷰가 준비됐어요", body: "감정 풍경을 확인해보세요.", time: "어제", unread: false },
];

const QUESTS: Quest[] = [
  { id: "q1", title: "오늘의 일기 작성", desc: "한 줄이라도 좋아요", reward: 12, done: true },
  { id: "q2", title: "모모와 3턴 대화하기", desc: "마음을 풀어보세요", reward: 8, done: false },
  { id: "q3", title: "친구 행성 방문", desc: "감정 닮음 확인", reward: 6, done: false },
  { id: "q4", title: "컨디션 체크하기", desc: "수면과 마음 점수", reward: 5, done: true },
];

const INVENTORY: InventoryItem[] = [
  { id: "i1", name: "달 데코", emoji: "🌙", category: "deco", owned: true, price: 30 },
  { id: "i2", name: "별 스티커", emoji: "✨", category: "deco", owned: true, price: 20 },
  { id: "i3", name: "구름", emoji: "☁️", category: "weather", owned: true, price: 25 },
  { id: "i4", name: "번개", emoji: "⚡", category: "weather", owned: false, price: 45 },
  { id: "i5", name: "오로라", emoji: "🌈", category: "weather", owned: false, price: 80 },
  { id: "i6", name: "고래", emoji: "🐋", category: "creature", owned: false, price: 120 },
  { id: "i7", name: "여우", emoji: "🦊", category: "creature", owned: true, price: 60 },
  { id: "i8", name: "나무", emoji: "🌳", category: "deco", owned: false, price: 35 },
  { id: "i9", name: "꽃", emoji: "🌸", category: "deco", owned: true, price: 18 },
];

interface AppState {
  friends: Friend[];
  notifications: NotificationItem[];
  quests: Quest[];
  inventory: InventoryItem[];
  attendance: number[]; // 출석한 일자 인덱스 (0~13)
  condition: { score: number; sleep: number; tags: string[] };
  settings: Settings;
  markNotifsRead: () => void;
  toggleQuest: (id: string) => void;
  buyItem: (id: string) => void;
  setCondition: (score: number, sleep: number, tags: string[]) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  addFriend: (code: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  friends: FRIENDS,
  notifications: NOTIFS,
  quests: QUESTS,
  inventory: INVENTORY,
  attendance: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // 13일 연속
  condition: { score: 72, sleep: 7, tags: ["피곤", "차분"] },
  settings: { notifPush: true, notifLetter: true, notifFriend: true, weekStart: "mon", theme: "dark" },
  markNotifsRead: () => set({ notifications: get().notifications.map((n) => ({ ...n, unread: false })) }),
  toggleQuest: (id) => set({ quests: get().quests.map((q) => (q.id === id ? { ...q, done: !q.done } : q)) }),
  buyItem: (id) => set({ inventory: get().inventory.map((i) => (i.id === id ? { ...i, owned: true } : i)) }),
  setCondition: (score, sleep, tags) => set({ condition: { score, sleep, tags } }),
  setSetting: (k, v) => set({ settings: { ...get().settings, [k]: v } }),
  addFriend: (code) => {
    if (!code.trim()) return false;
    const name = code.split(/[-_]/)[0]?.slice(0, 6) || "친구";
    const f: Friend = {
      id: `f${Date.now()}`,
      name,
      planetColor: "purple",
      similarity: Math.floor(40 + Math.random() * 50),
      code,
      lastEmotion: "차분",
    };
    set({ friends: [...get().friends, f] });
    return true;
  },
}));
