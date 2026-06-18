// 산책 모드 방향 패드 — 화면 d-pad + 방향키(WASD/화살표)로 모모를 움직인다.
// walkInput(공유 ref)을 갱신하면 Planet useFrame이 행성을 굴려 걷는 느낌을 만든다.
import { useEffect } from "react";
import { useDioramaStore } from "../dioramaStore";
import { walkInput } from "@/glass-momo/sharedRefs";

function clear() {
  walkInput.x = 0;
  walkInput.y = 0;
}

const btn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,.16)",
  background: "rgba(20,18,34,.42)",
  color: "#fff",
  fontSize: 16,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  touchAction: "none",
};

export function WalkPad() {
  const mode = useDioramaStore((s) => s.cameraMode);

  useEffect(() => {
    if (mode !== "walk") {
      clear();
      return;
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") walkInput.y = 1;
      else if (k === "arrowdown" || k === "s") walkInput.y = -1;
      else if (k === "arrowleft" || k === "a") walkInput.x = -1;
      else if (k === "arrowright" || k === "d") walkInput.x = 1;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "arrowdown" || k === "w" || k === "s") walkInput.y = 0;
      if (k === "arrowleft" || k === "arrowright" || k === "a" || k === "d") walkInput.x = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      clear();
    };
  }, [mode]);

  if (mode !== "walk") return null;

  const hold = (x: number, y: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      walkInput.x = x;
      walkInput.y = y;
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 188,
        display: "grid",
        gridTemplateColumns: "repeat(3, 40px)",
        gridTemplateRows: "repeat(3, 40px)",
        gap: 5,
        zIndex: 45,
        pointerEvents: "auto",
      }}
      aria-label="산책 방향 조작"
    >
      <span />
      <button style={btn} {...hold(0, 1)} aria-label="앞으로">↑</button>
      <span />
      <button style={btn} {...hold(-1, 0)} aria-label="왼쪽">←</button>
      <span />
      <button style={btn} {...hold(1, 0)} aria-label="오른쪽">→</button>
      <span />
      <button style={btn} {...hold(0, -1)} aria-label="뒤로">↓</button>
      <span />
    </div>
  );
}
