// 26 · 아바타 성장기 미리보기.
// 일주일(7단계) 동안 모모가 어떻게 자라는지 한 화면에서 다 보여줌.
// 메인 무대(R3F 1개) + 7단계 미리보기 칩(R3F 7개) + scrub + "디오라마로 보기".
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Button, CapLabel } from "../ui/primitives";
import { MomoCharacter } from "@/diorama/MomoCharacter";
import {
  STAGE_LIST,
  STAGES,
  streakToStage,
  useGrowthPreview,
  type GrowthStage,
} from "@/diorama/growth";
import { useUserStore } from "@/store/userStore";
import { useEmotionStore, BRANCH } from "@/store/emotionStore";
import "./avatarJourney.css";

export default function AvatarJourney() {
  const nav = useNavigate();
  const streak = useUserStore((s) => s.streak);
  const realStage = streakToStage(streak);
  const preview = useGrowthPreview((s) => s.preview);
  const setPreview = useGrowthPreview((s) => s.setPreview);
  const branch = useEmotionStore((s) => s.branch);
  const soul = useMemo(
    () => "#" + BRANCH[branch].soul.toString(16).padStart(6, "0"),
    [branch],
  );

  // 처음 진입 시 현재 단계로 시작 (이미 preview 있으면 유지)
  useEffect(() => {
    if (preview == null) setPreview(realStage);
  }, [preview, realStage, setPreview]);

  const active: GrowthStage = preview ?? realStage;
  const spec = STAGES[active];

  return (
    <>
      <StatusBar />
      <AppBar
        back
        title="모모 성장기"
        right={
          <button
            className="iv-iconbtn"
            aria-label="현재 단계로"
            onClick={() => setPreview(realStage)}
          >
            ↺
          </button>
        }
      />
      <Body>
        <div className="iv-journey">
          <div className="iv-journey-head">
            <CapLabel>WEEK · 7 DAYS</CapLabel>
            <h2>한 주를 보내는 동안</h2>
            <p>매일 마음을 기록하면 모모가 7단계로 자라요.</p>
          </div>

          {/* === 메인 무대 === */}
          <div className="iv-journey-stage">
            <Canvas
              camera={{ position: [0, 0, 0.95], fov: 38 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
            >
              <ambientLight color={0xb8b0e8} intensity={0.6} />
              <directionalLight color={0xffffff} intensity={1.3} position={[2, 3, 4]} />
              <directionalLight color={0xa394f7} intensity={0.7} position={[-3, -1, -2]} />
              <MomoCharacter stage={active} soulColor={soul} animated breath={1.2} />
            </Canvas>
            {/* 무대 라벨 */}
            <div className="iv-journey-stage-label">
              <span className="iv-journey-day">{spec.day}</span>
              <span className="iv-journey-name">{spec.name}</span>
            </div>
          </div>

          <p className="iv-journey-caption">{spec.caption}</p>

          {/* === 단계 칩 7개 === */}
          <div className="iv-journey-strip" role="tablist" aria-label="성장 단계 선택">
            {STAGE_LIST.map((s) => (
              <button
                key={s.stage}
                role="tab"
                aria-selected={s.stage === active}
                className={`iv-journey-chip${s.stage === active ? " on" : ""}${
                  s.stage <= realStage ? " unlocked" : " locked"
                }`}
                onClick={() => setPreview(s.stage)}
              >
                <span className="iv-journey-chip-canvas">
                  <Canvas
                    camera={{ position: [0, 0, 0.85], fov: 36 }}
                    gl={{ antialias: true, alpha: true }}
                    dpr={[1, 2]}
                  >
                    <ambientLight intensity={0.7} />
                    <directionalLight intensity={1.1} position={[2, 3, 4]} />
                    <MomoCharacter stage={s.stage} soulColor={soul} animated />
                  </Canvas>
                </span>
                <span className="iv-journey-chip-label">
                  <span className="iv-journey-chip-day">D{s.stage}</span>
                  <span className="iv-journey-chip-name">{s.name}</span>
                </span>
                {s.stage > realStage && (
                  <span className="iv-journey-chip-lock" aria-hidden="true">🔒</span>
                )}
                {s.stage === realStage && s.stage !== active && (
                  <span className="iv-journey-chip-now" aria-hidden="true">NOW</span>
                )}
              </button>
            ))}
          </div>

          {/* === Scrub 슬라이더 === */}
          <div className="iv-journey-scrub">
            <span>DAY 1</span>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={active}
              onChange={(e) => setPreview(Number(e.target.value) as GrowthStage)}
              aria-label="성장 단계 미리보기"
            />
            <span>DAY 7</span>
          </div>

          {/* === 현재 진행 표시 === */}
          <div className="iv-journey-status">
            <div>
              <span className="iv-journey-status-k">현재 연속</span>
              <strong>{streak}일</strong>
            </div>
            <div>
              <span className="iv-journey-status-k">도달 단계</span>
              <strong>
                {STAGES[realStage].day} · {STAGES[realStage].name}
              </strong>
            </div>
            <div>
              <span className="iv-journey-status-k">남은 단계</span>
              <strong>{Math.max(0, 7 - realStage)}일</strong>
            </div>
          </div>

          {/* === CTA === */}
          <div className="iv-journey-cta">
            <Button
              onClick={() => {
                setPreview(null); // 디오라마에서는 실제 단계로 복귀
                nav("/glass");
              }}
              block
            >
              디오라마에서 실시간으로 보기
            </Button>
            <button className="iv-btn iv-btn-ghost iv-btn-block" onClick={() => nav("/home")}>
              홈으로
            </button>
          </div>
        </div>
      </Body>
    </>
  );
}
