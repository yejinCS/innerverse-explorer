// 15 · 과거의 편지 (편지 수신 + 가정법 시뮬레이션)
import { useState } from "react";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Card, Button, CapLabel, Chip } from "../ui/primitives";
import { Planet2D } from "../ui/planet";

const SCENARIOS = [
  "그날 그 사람과 솔직하게 얘기했더라면",
  "조금 더 쉬어가는 선택을 했더라면",
  "그 일을 꼭 해내야 한다고 믿지 않았더라면",
];

const SIM_RESULT: Record<string, { color: "green" | "blue" | "love" | "amber"; line: string }> = {
  "그날 그 사람과 솔직하게 얘기했더라면": { color: "love", line: "사이는 가까워졌겠지만, 한동안 더 흔들렸을 수 있어." },
  "조금 더 쉬어가는 선택을 했더라면": { color: "green", line: "결과는 비슷했고, 너의 어깨는 훨씬 가벼웠을 거야." },
  "그 일을 꼭 해내야 한다고 믿지 않았더라면": { color: "blue", line: "다른 길이 보였을 거고, 마음은 더 너그러웠을 거야." },
};

export default function PastLetter() {
  const [sim, setSim] = useState<string | null>(null);
  const result = sim ? SIM_RESULT[sim] : null;

  return (
    <>
      <StatusBar />
      <AppBar back title="과거의 편지" />
      <Body>
        <Card variant="purple">
          <CapLabel>FROM PAST YOU</CapLabel>
          <div style={{ fontSize: 13.5, lineHeight: 1.8, color: "rgba(255,255,255,.92)" }}>
            3개월 전 오늘의 나에게,<br /><br />
            "별 거 아닌 일에도 너무 힘들어하지 마. 그때의 너가 충분히 잘하고 있어. 다음의 너는 그걸 알아보고
            한 박자 더 부드러워질 수 있을 거야." <br />
            <span style={{ color: "rgba(255,255,255,.6)" }}>— 2024년의 너로부터</span>
          </div>
        </Card>

        <Card>
          <div className="iv-section-h">그날의 행성</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Planet2D color="blue" size={70} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--iv-txt2)" }}>2024-02-24</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>차분·슬픔의 결</div>
              <div style={{ fontSize: 11.5, color: "var(--iv-txt3)", marginTop: 2 }}>
                기록 18줄 · 키워드 #회의 #지침 #산책
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="iv-section-h">만약, 그때 다른 선택을 했다면?</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SCENARIOS.map((s) => (
              <Chip key={s} active={sim === s} onClick={() => setSim(s)}>
                {s}
              </Chip>
            ))}
          </div>
          {result && (
            <div
              style={{
                marginTop: 6,
                padding: 14,
                borderRadius: 14,
                background: "rgba(163,148,247,.1)",
                border: "1px solid rgba(163,148,247,.3)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Planet2D color={result.color} size={56} />
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--iv-txt)" }}>
                {result.line}
              </div>
            </div>
          )}
        </Card>

        <Button block onClick={() => alert("편지를 보관함에 저장했어요")}>
          편지 보관하기
        </Button>
      </Body>
    </>
  );
}
