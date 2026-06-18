// 17 · 모모 대화 → 일기 완성 시트
import { useLocation, useNavigate } from "react-router-dom";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Card, Button } from "../ui/primitives";
import { EmotionTag } from "../ui/emotion";
import { useDiaryStore, type EmotionLabel } from "@/store/diaryStore";

interface Msg {
  who: "momo" | "me";
  text: string;
  emo?: EmotionLabel;
}

export default function DiaryComplete() {
  const nav = useNavigate();
  const loc = useLocation();
  const add = useDiaryStore((s) => s.add);
  const msgs: Msg[] = (loc.state as { msgs?: Msg[] })?.msgs ?? [];
  const myLines = msgs.filter((m) => m.who === "me");
  const body = myLines.map((m) => m.text).join(" ");
  const tally: Partial<Record<EmotionLabel, number>> = {};
  myLines.forEach((m) => {
    if (!m.emo) return;
    tally[m.emo] = (tally[m.emo] ?? 0) + 1;
  });
  const totalTags = Object.values(tally).reduce<number>((s, v) => s + (v ?? 0), 0) || 1;
  const emotions = (Object.entries(tally) as Array<[EmotionLabel, number]>)
    .map(([label, v]) => ({ label, pct: Math.round((v / totalTags) * 100) }))
    .sort((a, b) => b.pct - a.pct);
  const primary: EmotionLabel = emotions[0]?.label ?? "차분";
  const keywords = Array.from(body.matchAll(/[가-힣]{2,5}/g)).map((m) => m[0]).filter((w, i, a) => a.indexOf(w) === i).slice(0, 4);

  const onSave = () => {
    if (!body) {
      nav("/home");
      return;
    }
    const entry = add({
      date: new Date().toISOString().slice(0, 10),
      preview: body.slice(0, 60),
      body,
      audioSec: 0,
      emotions: emotions.length ? emotions : [{ label: "차분", pct: 100 }],
      keywords,
      primary,
    });
    nav(`/diary/${entry.id}`, { replace: true });
  };

  return (
    <>
      <StatusBar />
      <AppBar back title="대화에서 일기로" />
      <Body>
        <Card variant="purple">
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.6 }}>
            대화를 들어보고 모모가 일기로 정리했어. 마음에 안 들면 직접 다듬어도 돼.
          </div>
        </Card>

        <Card>
          <div className="iv-section-h">
            <span>오늘의 일기</span>
            {emotions.length > 0 && <EmotionTag label={primary} />}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--iv-txt)" }}>
            {body || "(아직 들려준 마음이 없어요.)"}
          </div>
        </Card>

        {keywords.length > 0 && (
          <Card size="sm">
            <div className="iv-section-h">키워드</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {keywords.map((k) => (
                <span
                  key={k}
                  style={{
                    fontSize: 12,
                    padding: "5px 11px",
                    borderRadius: 999,
                    background: "var(--iv-surf2)",
                    color: "var(--iv-txt)",
                    fontWeight: 600,
                  }}
                >
                  #{k}
                </span>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
          <Button variant="ghost" block onClick={() => nav(-1)}>
            대화로 돌아가기
          </Button>
          <Button block onClick={onSave}>
            저장하기
          </Button>
        </div>
      </Body>
    </>
  );
}
