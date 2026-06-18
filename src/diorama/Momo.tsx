// 모모 — 모드별 동작.
//  walk : 화면 정면에 '고정'(절대 뒤집힘 X). 이동은 Planet이 발밑에서 굴러 표현.
//  orbit: 예전처럼 표면을 자유롭게 자동 산책(드래그 회전을 따라감).
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEmotionStore, BRANCH } from "@/store/emotionStore";
import { sharedRefs, walkInput, planetRot } from "@/glass-momo/sharedRefs";
import { PLANET_RADIUS } from "./constants";
import { MomoCharacter } from "./MomoCharacter";
import { useCurrentStage, STAGES } from "./growth";
import { useDioramaStore } from "./dioramaStore";

// walk 모드 고정 위치 — 정면(+z) 약간 위. heading 0 = 화면 위(지평선)를 봄 → 카메라엔 뒤통수.
const FIXED_LON = Math.PI / 2;
const FIXED_LAT = 0.32;

export function Momo() {
  const grp = useRef<THREE.Group>(null);
  const branch = useEmotionStore((s) => s.branch);
  const soul = "#" + BRANCH[branch].soul.toString(16).padStart(6, "0");
  const stage = useCurrentStage();
  const spec = STAGES[stage];
  const mode = useDioramaStore((s) => s.cameraMode);

  const hopTick = useEmotionStore((s) => s.hopTick);
  const lastTick = useRef(hopTick);
  const hop = useRef(0);
  const q = useRef(new THREE.Quaternion());

  useFrame((state, dt) => {
    if (!grp.current) return;
    const t = state.clock.elapsedTime;

    let lon: number;
    let lat: number;
    let heading: number;
    const isWalk = mode === "walk";
    if (isWalk) {
      lon = FIXED_LON;
      lat = FIXED_LAT;
      heading = 0;
    } else {
      lon = Math.PI / 2 + t * 0.08;
      lat = Math.sin(t * 0.14) * 0.25;
      heading = Math.PI / 2; // 경도 방향(동쪽) 진행
    }

    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    const co = Math.cos(lon);
    const so = Math.sin(lon);

    const surface = new THREE.Vector3(PLANET_RADIUS * cl * co, PLANET_RADIUS * sl, PLANET_RADIUS * cl * so);
    const normal = surface.clone().normalize();
    const north = new THREE.Vector3(-sl * co, cl, -sl * so).normalize();
    const east = new THREE.Vector3(-so, 0, co).normalize();
    const forward = north
      .clone()
      .multiplyScalar(Math.cos(heading))
      .add(east.clone().multiplyScalar(Math.sin(heading)))
      .normalize();

    // 궤도 모드: 드래그 회전(planetRot)을 모모에도 적용해 행성 위에 붙어있게
    if (!isWalk) {
      q.current.setFromEuler(new THREE.Euler(planetRot.x, planetRot.y, 0, "XYZ"));
      surface.applyQuaternion(q.current);
      normal.applyQuaternion(q.current);
      forward.applyQuaternion(q.current);
    }

    // bob + hop + (walk 이동 중) 걸음 들썩
    const moving = isWalk && Math.abs(walkInput.x) + Math.abs(walkInput.y) > 0;
    const bob = Math.sin(t * 1.6) * 0.015;
    const step = moving ? Math.abs(Math.sin(t * 9)) * 0.035 : 0;
    if (hopTick !== lastTick.current) {
      hop.current = 1;
      lastTick.current = hopTick;
    }
    if (hop.current > 0) hop.current = Math.max(0, hop.current - dt * 2.5);
    const hopY = hop.current > 0 ? Math.sin((1 - hop.current) * Math.PI) * 0.12 : 0;
    const lift = 0.13 * spec.bodyScale + bob + hopY + step;

    grp.current.position.copy(surface).multiplyScalar(1 + lift / PLANET_RADIUS);

    const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
    grp.current.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, forward));

    sharedRefs.momoWorldPos.copy(grp.current.position);
    sharedRefs.momoWorldFwd.copy(forward);
  });

  return (
    <group ref={grp}>
      <MomoCharacter stage={stage} soulColor={soul} />
    </group>
  );
}
