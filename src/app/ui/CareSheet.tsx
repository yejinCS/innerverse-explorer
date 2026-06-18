// 위기 → 상담 연계 시트 (닥터컨텍). 모모가 위기 신호 감지 시 표시.
// ⚠️ 진단 아님. 연결은 사용자 선택. 직접 의료행위 X → 제휴 상담사/병원 중개.
import { useState } from "react";
import { Button } from "./primitives";

const COUNSELORS = [
  { name: "마음돌봄 심리상담센터", spec: "불안·우울 · CBT", type: "상담", partner: true },
  { name: "서울온마음 정신건강의학과", spec: "비대면 진료 · 약물상담", type: "정신과", partner: true },
  { name: "연(緣) 상담연구소", spec: "대인관계 · 청년", type: "상담", partner: true },
];

export function CareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sent, setSent] = useState<string | null>(null);
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#12121c",
          borderRadius: "20px 20px 0 0",
          padding: "20px 18px calc(20px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(255,255,255,.1)",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>잠깐, 혼자 견디지 않아도 돼요 🌙</div>
        <p style={{ fontSize: 12.5, color: "var(--iv-txt2)", marginTop: 6, lineHeight: 1.6 }}>
          지금은 전문가의 도움이 힘이 될 수 있는 순간 같아요. 연결은 당신의 선택이에요.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {COUNSELORS.map((c) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                background: "var(--iv-surf2)",
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {c.name}
                  {c.partner && <span style={{ marginLeft: 6, fontSize: 10, color: "#6fe3a6" }}>제휴</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--iv-txt3)" }}>
                  {c.spec} · {c.type}
                </div>
              </div>
              <button
                onClick={() => setSent(c.name)}
                disabled={!!sent}
                style={{
                  flex: "0 0 auto",
                  background: "linear-gradient(135deg,#7c6fe8,#a394f7)",
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  opacity: sent ? 0.5 : 1,
                }}
              >
                연결
              </button>
            </div>
          ))}
        </div>

        {sent && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#6fe3a6" }}>
            ✓ {sent}에 연결 요청을 보냈어요. 곧 안내가 올 거예요.
          </div>
        )}

        <a
          href="tel:1393"
          style={{
            display: "block",
            marginTop: 14,
            textAlign: "center",
            background: "rgba(224,87,78,.18)",
            color: "#f2a59c",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 12,
            padding: "11px 0",
            textDecoration: "none",
          }}
        >
          지금 많이 힘들다면 — 1393 (자살예방상담)
        </a>

        <Button variant="ghost" block onClick={onClose} style={{ marginTop: 10 }}>
          닫기
        </Button>
      </div>
    </div>
  );
}
