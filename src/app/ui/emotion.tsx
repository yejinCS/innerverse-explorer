// 감정 시각화 컴포넌트들
import { EmotionLabel, EMOTION_COLORS } from "@/store/diaryStore";

export function EmotionDot({ label }: { label: EmotionLabel }) {
  return <span className="iv-emodot" style={{ background: EMOTION_COLORS[label] }} aria-hidden="true" />;
}

export function EmotionTag({ label }: { label: EmotionLabel }) {
  return (
    <span className="iv-emotag" style={{ color: EMOTION_COLORS[label] }}>
      <EmotionDot label={label} />
      {label}
    </span>
  );
}

export function EmotionBar({
  label,
  pct,
  showLabel = true,
}: {
  label: EmotionLabel;
  pct: number;
  showLabel?: boolean;
}) {
  const color = EMOTION_COLORS[label];
  return (
    <div className="iv-emobar">
      {showLabel && <div className="iv-emobar-label">{label}</div>}
      <div className="iv-emobar-track">
        <div className="iv-emobar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="iv-emobar-val">{pct}%</div>
    </div>
  );
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function DateChip({
  date,
  emotion,
  active,
  onClick,
}: {
  date: string; // ISO yyyy-mm-dd
  emotion?: EmotionLabel;
  active?: boolean;
  onClick?: () => void;
}) {
  const d = new Date(date);
  const day = d.getDate();
  const wd = WEEK[d.getDay()];
  const color = emotion ? EMOTION_COLORS[emotion] : "#6a6480";
  const bg = active ? color : `${color}22`;
  const fg = active ? "#fff" : color;
  return (
    <button
      className="iv-datechip"
      style={{ background: bg, color: fg, border: `1px solid ${color}33` }}
      onClick={onClick}
    >
      <span className="iv-datechip-day">{day}</span>
      <span className="iv-datechip-week">{wd}</span>
    </button>
  );
}
