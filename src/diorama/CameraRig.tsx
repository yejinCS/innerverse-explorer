// 카메라 — 궤도(orbit) / 산책(walk) 두 모드 lerp 전환.
// orbit: 행성 전체를 손바닥 위 보듯, walk: 모모 옆 표면 1m 거리.
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDioramaStore } from "./dioramaStore";
import { sharedRefs } from "@/glass-momo/sharedRefs";

// orbit: 행성을 화면 아래쪽으로 내려서 상반신만 보이게 — 표면 구조물 시야 확보.
const ORBIT_POS = new THREE.Vector3(0, 1.25, 6.4);
const ORBIT_LOOK = new THREE.Vector3(0, 0.55, 0);

export function CameraRig() {
  const { camera } = useThree();
  const mode = useDioramaStore((s) => s.cameraMode);
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const wantPos = useRef(new THREE.Vector3());
  const wantLook = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (mode === "orbit") {
      wantPos.current.copy(ORBIT_POS);
      wantLook.current.copy(ORBIT_LOOK);
    } else {
      // walk: 모모 위치 기준으로 표면 가까이.
      const mp = sharedRefs.momoWorldPos;
      if (mp.lengthSq() < 0.01) {
        wantPos.current.copy(ORBIT_POS);
        wantLook.current.copy(ORBIT_LOOK);
      } else {
        // 3인칭(마크처럼) — 모모 뒤(-fwd) + 살짝 위에서 뒤통수를 내려본다.
        const n = mp.clone().normalize();
        const fwd = sharedRefs.momoWorldFwd;
        const WUP = new THREE.Vector3(0, 1, 0);
        wantPos.current
          .copy(mp)
          .add(fwd.clone().multiplyScalar(-1.25))
          .add(n.clone().multiplyScalar(0.55))
          .add(WUP.clone().multiplyScalar(0.8));
        // 시선 = 모모 앞쪽(지평선)
        wantLook.current
          .copy(mp)
          .add(fwd.clone().multiplyScalar(1.1))
          .add(WUP.clone().multiplyScalar(0.12));
      }
    }
    camera.position.lerp(wantPos.current, Math.min(1, dt * 2.0));
    lookAt.current.lerp(wantLook.current, Math.min(1, dt * 3.5));
    camera.lookAt(lookAt.current);
  });

  return null;
}
