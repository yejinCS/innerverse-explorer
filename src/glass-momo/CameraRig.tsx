// 카메라 위치/시선. solo/friend 모드 사이를 lerp으로 부드럽게 전환.
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEmotionStore } from "@/store/emotionStore";

// 마크 3인칭처럼: 모모를 피사체로 정면 중앙에 두고, 살짝 위에서 내려다봄.
// 시선 타깃이 행성 중심(0,0,0)이 아니라 행성 앞면에 선 모모(≈ z 1.67).
// 행성은 모모 발밑에서 유리 "땅"처럼 곡선으로 깔린다.
const SOLO_POS = new THREE.Vector3(0, 1.6, 6.6);
const FRIEND_POS = new THREE.Vector3(2.1, 2.2, 13);
const SOLO_LOOK = new THREE.Vector3(0, 0.3, 1.65);
const FRIEND_LOOK = new THREE.Vector3(2.1, 0.2, 1.5);

export function CameraRig() {
  const { camera } = useThree();
  const friendMode = useEmotionStore((s) => s.friendMode);
  const tmp = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const want = friendMode ? FRIEND_POS : SOLO_POS;
    const look = friendMode ? FRIEND_LOOK : SOLO_LOOK;
    camera.position.lerp(want, Math.min(1, dt * 2.2));
    tmp.current.copy(look);
    camera.lookAt(tmp.current);
  });

  return null;
}
