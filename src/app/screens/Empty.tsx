// 19 · 빈 상태 (첫 일기 안내)
import { useNavigate } from "react-router-dom";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Button, CapLabel } from "../ui/primitives";
import { Planet2D } from "../ui/planet";

export default function Empty() {
  const nav = useNavigate();
  return (
    <>
      <StatusBar />
      <AppBar back title="기록한 마음들" />
      <Body>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 18,
            padding: "20px",
          }}
        >
          <div style={{ filter: "grayscale(.3) brightness(.85)" }}>
            <Planet2D color="void" size={130} />
          </div>
          <CapLabel>EMPTY UNIVERSE</CapLabel>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>아직 행성이 비어있어요</h2>
            <p style={{ fontSize: 13, color: "var(--iv-txt2)", marginTop: 8, lineHeight: 1.6 }}>
              첫 마음을 남기면 행성이 자라기 시작해요.<br />
              한 줄이라도, 한 마디라도 괜찮아요.
            </p>
          </div>
          <Button onClick={() => nav("/diary/write")} style={{ minWidth: 200 }}>
            첫 일기 쓰기
          </Button>
          <button
            onClick={() => nav("/momo/chat")}
            style={{
              background: "none",
              border: "none",
              color: "var(--iv-purple2)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            또는 모모와 대화로 시작 →
          </button>
        </div>
      </Body>
    </>
  );
}
