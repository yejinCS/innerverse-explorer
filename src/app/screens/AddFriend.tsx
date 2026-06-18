// 25 · 친구 찾기 (행성 코드 + 추천 친구)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Card, Button, CapLabel } from "../ui/primitives";
import { Planet2D } from "../ui/planet";
import { useAppStore } from "@/store/appStore";
import { useUserStore } from "@/store/userStore";

export default function AddFriend() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const userCode = useUserStore((s) => s.planetCode);
  const friends = useAppStore((s) => s.friends);
  const add = useAppStore((s) => s.addFriend);

  const onAdd = () => {
    if (add(code)) {
      setCode("");
      nav(`/friend/${useAppStore.getState().friends.at(-1)?.id}`);
    }
  };

  return (
    <>
      <StatusBar />
      <AppBar back title="친구 찾기" />
      <Body>
        <Card variant="purple">
          <CapLabel>MY PLANET CODE</CapLabel>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textAlign: "center",
              padding: "10px 0",
              fontFamily: "monospace",
            }}
          >
            {userCode}
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(userCode)}
            style={{
              background: "rgba(255,255,255,.12)",
              border: "none",
              color: "#fff",
              fontSize: 12,
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              alignSelf: "center",
            }}
          >
            코드 복사하기
          </button>
        </Card>

        <Card>
          <div className="iv-section-h">친구의 행성 코드</div>
          <input
            className="iv-input"
            placeholder="예: SOYEON-2210"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button block onClick={onAdd} disabled={!code.trim()}>
            친구 행성 방문
          </Button>
        </Card>

        <div className="iv-cap">RECOMMENDED</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {friends.map((f) => (
            <Card key={f.id} size="sm" onClick={() => nav(`/friend/${f.id}`)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Planet2D color={f.planetColor} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--iv-txt2)" }}>
                    {f.code} · 닮음 {f.similarity}%
                  </div>
                </div>
                <div style={{ color: "var(--iv-purple2)", fontSize: 18 }}>›</div>
              </div>
            </Card>
          ))}
        </div>
      </Body>
    </>
  );
}
