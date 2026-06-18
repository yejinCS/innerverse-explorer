// 10 · 퀘스트 (일일 미션 + 별조각 보상)
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Card, CapLabel } from "../ui/primitives";
import { useAppStore } from "@/store/appStore";
import { useUserStore } from "@/store/userStore";

export default function Quest() {
  const quests = useAppStore((s) => s.quests);
  const toggle = useAppStore((s) => s.toggleQuest);
  const earn = useUserStore((s) => s.earnStardust);
  const done = quests.filter((q) => q.done).length;

  const onCheck = (id: string, reward: number, wasDone: boolean) => {
    toggle(id);
    if (!wasDone) earn(reward);
  };

  return (
    <>
      <StatusBar />
      <AppBar back title="오늘의 퀘스트" />
      <Body>
        <div style={{ textAlign: "center" }}>
          <CapLabel>DAILY QUEST</CapLabel>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>
            {done}/{quests.length} 완료
          </h2>
          <p style={{ fontSize: 12, color: "var(--iv-txt2)", marginTop: 4 }}>완료할수록 행성이 더 풍성해져요</p>
        </div>

        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "rgba(255,255,255,.07)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(done / quests.length) * 100}%`,
              height: "100%",
              background: "linear-gradient(135deg,#7c6fe8,#a394f7)",
              transition: "width .4s",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quests.map((q) => (
            <Card key={q.id} size="sm">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => onCheck(q.id, q.reward, q.done)}
                  aria-label={q.done ? "완료 취소" : "완료 처리"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: q.done ? "none" : "2px solid var(--iv-line)",
                    background: q.done ? "linear-gradient(135deg,#7c6fe8,#a394f7)" : "transparent",
                    color: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                    flex: "0 0 auto",
                  }}
                >
                  {q.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: q.done ? "var(--iv-txt3)" : "var(--iv-txt)", textDecoration: q.done ? "line-through" : "none" }}>
                    {q.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--iv-txt3)", marginTop: 2 }}>{q.desc}</div>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    padding: "4px 9px",
                    borderRadius: 999,
                    background: "rgba(232,196,95,.18)",
                    color: "#e8c45f",
                    fontWeight: 700,
                  }}
                >
                  ✦ {q.reward}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card variant="purple">
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            매일 자정 새로운 퀘스트가 생성돼요. 연속 완료 시 보너스 +20.
          </div>
        </Card>
      </Body>
    </>
  );
}
