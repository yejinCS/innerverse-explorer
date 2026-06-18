// 04 · 일기 작성 (녹음 + 텍스트). 분석은 mock — 키워드 매칭으로 감정 비중 추정.
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Button } from "../ui/primitives";
import { useDiaryStore, type EmotionLabel } from "@/store/diaryStore";
import { analyzeDiary, analyzeVision } from "@/lib/api";

const RULES: Array<[EmotionLabel, RegExp]> = [
  ["기쁨", /기쁘|행복|뿌듯|좋|감사|신나|설레|즐거/],
  ["사랑", /사랑|보고싶|애틋|따뜻|애정/],
  ["차분", /평온|편안|안정|차분|괜찮|담담|쉬|쉬엄/],
  ["슬픔", /슬프|우울|눈물|외로|지쳤|허전|아프/],
  ["분노", /화|짜증|답답|억울|열받|분노|짜증/],
  ["긴장", /불안|걱정|초조|긴장|무섭|두렵|떨려|회의/],
  ["공허", /공허|텅 빈|무기력|허무|아무것/],
];

function analyze(text: string): { emotions: Array<{ label: EmotionLabel; pct: number }>; keywords: string[]; primary: EmotionLabel } {
  const scores: Record<EmotionLabel, number> = { 기쁨: 4, 차분: 4, 사랑: 2, 슬픔: 2, 분노: 1, 긴장: 2, 공허: 1 };
  RULES.forEach(([label, re]) => {
    const m = text.match(new RegExp(re, "g"));
    if (m) scores[label] += m.length * 8;
  });
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const arr = (Object.entries(scores) as Array<[EmotionLabel, number]>)
    .map(([label, v]) => ({ label, pct: Math.round((v / total) * 100) }))
    .filter((x) => x.pct >= 5)
    .sort((a, b) => b.pct - a.pct);
  const keywords = Array.from(text.matchAll(/[가-힣]{2,6}/g)).map((m) => m[0]).filter((w, i, a) => a.indexOf(w) === i).slice(0, 4);
  return { emotions: arr, keywords, primary: arr[0]?.label ?? "차분" };
}

export default function DiaryWrite() {
  const nav = useNavigate();
  const add = useDiaryStore((s) => s.add);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioSec, setAudioSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [signal, setSignal] = useState<string | null>(null); // 사진/위치 패시브 신호 노트
  const [photoBusy, setPhotoBusy] = useState(false);

  // 사진 → Vision으로 장면/분위기 추출 → 일기 맥락으로 추가
  const onPhoto = async (file: File | null) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const v = await analyzeVision(file);
      const tag = `[📷 ${v.scene || v.labels.join(", ")}]`;
      setText((t) => (t ? t + "\n" + tag : tag));
      setSignal(`사진 인식: ${v.labels.slice(0, 3).join(" · ")}`);
    } catch {
      setSignal("사진 분석 실패 (AI 키 확인)");
    } finally {
      setPhotoBusy(false);
    }
  };

  // 위치(GPS) → 동의 기반 패시브 신호 (데모: 좌표 기록)
  const onLoc = () => {
    if (!navigator.geolocation) {
      setSignal("이 기기는 위치를 지원하지 않아요");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setText((t) => (t ? t + "\n[📍 위치 기록됨]" : "[📍 위치 기록됨]"));
        setSignal(`위치 기록: ${latitude.toFixed(3)}, ${longitude.toFixed(3)} · 동의 기반`);
      },
      () => setSignal("위치 권한이 거부됐어요"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  // 음성 → 자동 받아쓰기 (브라우저 내장 STT, 한국어). 말하면 일기로 채워짐.
  const toggleRec = () => {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 써주세요 🙏");
      return;
    }
    const rec = new SR();
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.continuous = true;
    let base = text ? text + " " : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) base += r[0].transcript;
        else interim += r[0].transcript;
      }
      setText((base + interim).trimStart());
    };
    rec.onend = () => {
      setRecording(false);
      if (timer.current) window.clearInterval(timer.current);
    };
    rec.onerror = () => {
      setRecording(false);
      if (timer.current) window.clearInterval(timer.current);
    };
    recRef.current = rec;
    setAudioSec(0);
    setRecording(true);
    timer.current = window.setInterval(() => setAudioSec((s) => s + 1), 1000);
    rec.start();
  };

  const onSubmit = async () => {
    if ((!text.trim() && audioSec === 0) || loading) return;
    setLoading(true);

    // 백엔드(Gemini) 분석 우선, 실패하면 로컬 규칙으로 폴백
    let analyzed: { emotions: { label: EmotionLabel; pct: number }[]; keywords: string[]; primary: EmotionLabel };
    try {
      const a = await analyzeDiary(text || "(음성 기록만)");
      analyzed = a.emotions.length ? a : analyze(text || "(음성 기록만)");
    } catch {
      analyzed = analyze(text || "(음성 기록만)");
    }

    const entry = add({
      date: new Date().toISOString().slice(0, 10),
      preview: (text || "음성으로 남긴 마음").slice(0, 60),
      body: text || "음성으로 남긴 마음",
      audioSec,
      emotions: analyzed.emotions,
      keywords: analyzed.keywords,
      primary: analyzed.primary,
    });

    // 로그인 상태면 DB에도 저장 (비로그인/실패는 조용히 무시)
    void (async () => {
      try {
        const { isSupabaseConfigured } = await import("@/lib/supabase");
        if (!isSupabaseConfigured) return;
        const { saveDiaryEntry } = await import("@/services/diaryApi");
        await saveDiaryEntry({
          date: entry.date,
          preview: entry.preview,
          body: entry.body,
          audioSec: entry.audioSec,
          emotions: entry.emotions,
          keywords: entry.keywords,
          primary: entry.primary,
        });
        // 장기기억 갱신 (③④ 사실·성향 추출) — 비동기, 실패 무시
        const { reflect } = await import("@/services/memory");
        await reflect();
      } catch {
        /* 무시 */
      }
    })();

    setLoading(false);
    nav(`/diary/result/${entry.id}`, { replace: true });
  };

  return (
    <>
      <StatusBar />
      <AppBar back title="오늘의 마음" />
      <Body>
        <div style={{ fontSize: 12, color: "var(--iv-txt2)" }}>
          {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </div>
        <textarea
          className="iv-input iv-textarea"
          placeholder={
            recording
              ? "🎙 듣고 있어요 — 말하는 대로 적혀요…"
              : "오늘 있었던 일, 떠오르는 감정을 적어보거나 🎤를 눌러 말해주세요…"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={recording}
        />

        {audioSec > 0 && !recording && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(163,148,247,.14)",
              border: "1px solid rgba(163,148,247,.3)",
              fontSize: 12.5,
              color: "var(--iv-purple2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🎙 {audioSec}초 말한 내용을 받아썼어요 — 그대로 보내면 일기가 돼요
            <button
              onClick={() => setAudioSec(0)}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--iv-txt3)", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}

        {signal && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--iv-purple2)", display: "flex", alignItems: "center", gap: 6 }}>
            ✦ {signal}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
        />

        <div style={{ marginTop: "auto", display: "flex", gap: 8, paddingTop: 16, alignItems: "center" }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            style={{
              width: 46,
              height: 56,
              borderRadius: 14,
              border: "none",
              background: "var(--iv-surf2)",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              flex: "0 0 auto",
              opacity: photoBusy ? 0.5 : 1,
            }}
            aria-label="사진 추가"
          >
            {photoBusy ? "…" : "📷"}
          </button>
          <button
            onClick={onLoc}
            style={{
              width: 46,
              height: 56,
              borderRadius: 14,
              border: "none",
              background: "var(--iv-surf2)",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
            aria-label="위치 기록"
          >
            📍
          </button>
          <button
            onClick={toggleRec}
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              border: "none",
              background: recording ? "rgba(232,116,78,.25)" : "var(--iv-surf2)",
              color: recording ? "#e8744e" : "#fff",
              fontSize: 24,
              cursor: "pointer",
              boxShadow: recording ? "0 0 20px -4px rgba(232,116,78,.5)" : "none",
              flex: "0 0 auto",
            }}
            aria-label={recording ? "녹음 중지" : "녹음 시작"}
          >
            {recording ? "■" : "🎤"}
          </button>
          <Button block onClick={onSubmit} disabled={loading || (!text.trim() && audioSec === 0)}>
            {loading ? "✦ 우주로 보내는 중…" : "✦ 우주로 전송하기"}
          </Button>
        </div>
      </Body>
    </>
  );
}
