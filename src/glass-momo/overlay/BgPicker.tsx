// 배경 색 변경 패널. 우상단 톱니 아이콘 → 펼치면 프리셋 그리드 + 커스텀 3색 픽커.
// 페이지(.iv-stage) 바깥에 떠 있는 floating 컨트롤 (폰 프레임 UI 일부가 아님).
import { useState, useRef, useEffect } from "react";
import { useEmotionStore } from "@/store/emotionStore";
import { BG_PRESETS } from "../bgPresets";

export function BgPicker() {
  const bgMode = useEmotionStore((s) => s.bgMode);
  const bgPreset = useEmotionStore((s) => s.bgPreset);
  const bgCustom = useEmotionStore((s) => s.bgCustom);
  const setBgPreset = useEmotionStore((s) => s.setBgPreset);
  const setBgCustom = useEmotionStore((s) => s.setBgCustom);
  const setBgMode = useEmotionStore((s) => s.setBgMode);

  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // 패널 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="iv-bgpicker" ref={wrap}>
      <button
        className="iv-bgpicker-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="배경 테마"
        aria-expanded={open}
      >
        <span aria-hidden="true">⚙</span>
        <span className="iv-bgpicker-btn-label">배경</span>
      </button>

      {open && (
        <div className="iv-bgpicker-panel" role="dialog" aria-label="배경 테마 선택">
          <div className="iv-bgpicker-section">
            <div className="iv-bgpicker-h">프리셋</div>
            <div className="iv-bgpicker-grid">
              {BG_PRESETS.map((p) => {
                const active = bgMode === "preset" && bgPreset === p.key;
                return (
                  <button
                    key={p.key}
                    className={`iv-bgpicker-swatch${active ? " on" : ""}`}
                    onClick={() => setBgPreset(p.key)}
                    title={p.label}
                    aria-pressed={active}
                  >
                    <span className="iv-bgpicker-thumb" style={{ background: p.preview }} />
                    <span className="iv-bgpicker-label">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="iv-bgpicker-section">
            <div className="iv-bgpicker-h">
              커스텀{" "}
              <button
                className="iv-bgpicker-mini"
                onClick={() => setBgMode("custom")}
                aria-pressed={bgMode === "custom"}
              >
                {bgMode === "custom" ? "사용 중" : "사용"}
              </button>
            </div>
            <div className="iv-bgpicker-customrow">
              {[0, 1, 2].map((i) => (
                <label key={i} className="iv-bgpicker-coloritem">
                  <input
                    type="color"
                    value={bgCustom[i as 0 | 1 | 2]}
                    onChange={(e) => setBgCustom(i as 0 | 1 | 2, e.target.value)}
                    aria-label={`색 ${i + 1}`}
                  />
                  <span>
                    {i === 0 ? "중심" : i === 1 ? "중간" : "외곽"}
                  </span>
                </label>
              ))}
            </div>
            <p className="iv-bgpicker-hint">
              세 색이 radial-gradient로 섞여요. (중심 → 외곽)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
