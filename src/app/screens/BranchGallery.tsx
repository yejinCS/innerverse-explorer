// 27 · 5갈래 진화 갤러리 (만개/평온/긴장/시듦/공허)
import { useNavigate } from "react-router-dom";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Card, CapLabel } from "../ui/primitives";
import { Planet2D } from "../ui/planet";

const BRANCHES = [
  { key: "bloom", color: "green" as const, name: "만개", desc: "긍정이 가득 쌓여 숲이 피어남", trigger: "기쁨/차분 비율 50%↑" },
  { key: "calm", color: "blue" as const, name: "평온", desc: "잔잔한 마음이 결정처럼 빛남", trigger: "기본값 (지배 감정 없음)" },
  { key: "tense", color: "amber" as const, name: "긴장", desc: "날카로운 마음이 가시로 돋음", trigger: "긴장 비율 34%↑" },
  { key: "wither", color: "void" as const, name: "시듦", desc: "슬픔이 쌓여 메말라감", trigger: "슬픔 비율 34%↑" },
  { key: "void", color: "void" as const, name: "공허", desc: "비어있는 마음, 파편만 떠다님", trigger: "공허 비율 38%↑" },
];

export default function BranchGallery() {
  const nav = useNavigate();
  return (
    <>
      <StatusBar />
      <AppBar back title="5분기 진화" />
      <Body>
        <div style={{ textAlign: "center" }}>
          <CapLabel>EVOLUTION BRANCHES</CapLabel>
          <h2 style={{ fontSize: 21, fontWeight: 800, marginTop: 6 }}>감정이 행성을 빚어요</h2>
          <p style={{ fontSize: 12.5, color: "var(--iv-txt2)", marginTop: 6, lineHeight: 1.6 }}>
            누적된 감정의 지배 비율에 따라 행성은 다섯 갈래로 진화해요.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {BRANCHES.map((b) => (
            <Card key={b.key}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Planet2D color={b.color} size={68} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{b.name}의 행성</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--iv-txt2)", marginTop: 3, lineHeight: 1.55 }}>
                    {b.desc}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--iv-purple2)", marginTop: 5, fontWeight: 600 }}>
                    조건: {b.trigger}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card variant="purple" onClick={() => nav("/glass")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>3D 글래스 모드로 보기</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 3 }}>
                감정 버튼으로 분기 전환을 체험
              </div>
            </div>
            <div style={{ fontSize: 22 }}>💎</div>
          </div>
        </Card>
      </Body>
    </>
  );
}
