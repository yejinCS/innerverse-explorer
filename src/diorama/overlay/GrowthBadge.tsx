// 디오라마 화면 상단의 성장 단계 배지 — 일주일 7단계 가운데 현재 어디인지 시각화.
// 단계 칩 7개 + 진행 게이지 + "DAY N · 이름" 캡션.
import { useNavigate } from "react-router-dom";
import { STAGE_LIST, useCurrentStage, STAGES } from "../growth";

export function GrowthBadge() {
  const nav = useNavigate();
  const stage = useCurrentStage();
  const spec = STAGES[stage];
  const pct = ((stage - 1) / 6) * 100;

  return (
    <button
      className="iv-growthbadge"
      onClick={() => nav("/avatar/journey")}
      aria-label={`현재 모모 성장: ${spec.day} ${spec.name}. 일주일 성장기 보기`}
    >
      <div className="iv-growthbadge-head">
        <span className="iv-growthbadge-day">{spec.day}</span>
        <span className="iv-growthbadge-name">{spec.name}</span>
        <span className="iv-growthbadge-chev">›</span>
      </div>
      <div className="iv-growthbadge-bar">
        <div className="iv-growthbadge-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="iv-growthbadge-pips" aria-hidden="true">
        {STAGE_LIST.map((s) => (
          <span
            key={s.stage}
            className={`iv-growthbadge-pip${s.stage <= stage ? " on" : ""}`}
            style={s.stage === stage ? { boxShadow: `0 0 8px ${s.swatch}`, background: s.swatch } : undefined}
          />
        ))}
      </div>
      <div className="iv-growthbadge-cap">{spec.caption}</div>
    </button>
  );
}
