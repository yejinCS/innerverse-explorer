// 디오라마 메인 — 폰 프레임 + Canvas + 오버레이 합성.
// 글래스 모모의 BgPicker / SpeechBubble / OutcomeBanner / EmotionDock 재사용.
import { useEffect, useState } from "react";
import { Scene } from "./Scene";
import { TopBar } from "./overlay/TopBar";
import { Toolbar } from "./overlay/Toolbar";
import { GrowthBadge } from "./overlay/GrowthBadge";
import { WalkPad } from "./overlay/WalkPad";
import { BgPicker } from "@/glass-momo/overlay/BgPicker";
import { SpeechBubble } from "@/glass-momo/overlay/SpeechBubble";
import { OutcomeBanner } from "@/glass-momo/overlay/OutcomeBanner";
import { EmotionDock } from "@/glass-momo/overlay/EmotionDock";
import { StatusBar } from "@/glass-momo/overlay/StatusBar";
import { selectBackground, useEmotionStore } from "@/store/emotionStore";
import "@/glass-momo/innerverse.css";
import "./diorama.css";

export function DioramaScene() {
  const background = useEmotionStore(selectBackground);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLoaded(true), 600);
    const r = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(r);
    };
  }, []);

  return (
    <div className="iv-stage" style={{ background }}>
      <BgPicker />
      <div className="iv-lead">
        <div className="iv-k">3D · MOMO &amp; ASTEROID</div>
        <h1>모모와 함께 자라는 한 주</h1>
        <p>
          매일의 마음이 쌓이면 모모가 <b>씨앗 → 새싹 → 광휘</b>까지 7단계로 자라요. 행성을
          회전시키거나 <b>👣 산책 모드</b>로 표면 가까이 내려가 보세요.
        </p>
      </div>

      <div className="iv-phone">
        <div className="iv-notch" />
        <div className="iv-screen">
          <div className="iv-canvas-host">
            <Scene />
          </div>

          <div className={`iv-loading${loaded ? " hide" : ""}`}>
            <div className="iv-ring" />
            <div className="iv-t">소혹성을 빚는 중…</div>
          </div>

          <div className="iv-overlay">
            <StatusBar />
            <TopBar />
            <GrowthBadge />
            <Toolbar />
            <WalkPad />
            <OutcomeBanner />
            <SpeechBubble />
            <EmotionDock />
          </div>
        </div>
      </div>
    </div>
  );
}
