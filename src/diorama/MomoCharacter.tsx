// 모모 캐릭터 메시 (세미월드 풍 둥근 3D 캐릭터). 성장 단계별 외형을 누적해서 표현.
// 행성 표면에 붙는 로직은 포함하지 않음 — Momo(산책)와 Journey 미리보기가 공유.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STAGES, type GrowthStage } from "./growth";

const BASE_RADIUS = 0.13;

interface Props {
  stage: GrowthStage;
  soulColor: string;        // 영혼 코어 색 (감정 분기 기반)
  /** 호흡/회전 등 자체 애니메이션 사용 여부 (true=미리보기, false=행성 산책 시 부모가 제어) */
  animated?: boolean;
  /** breath 진폭 */
  breath?: number;
}

export function MomoCharacter({ stage, soulColor, animated = false, breath = 1 }: Props) {
  const spec = STAGES[stage];
  const r = BASE_RADIUS * spec.bodyScale;

  const body = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const crownGrp = useRef<THREE.Group>(null);
  const aura = useRef<THREE.Mesh>(null);
  const root = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // 호흡 (squash/stretch)
    if (body.current) {
      const sq = Math.sin(t * 1.6) * 0.03 * breath;
      body.current.scale.set(1 + sq, 1 - sq * 0.8, 1 + sq);
    }
    // 후광 회전
    if (halo.current) halo.current.rotation.z = t * 0.45;
    // 왕관 별 회전
    if (crownGrp.current) crownGrp.current.rotation.y = t * 0.6;
    // 오라 pulsing
    if (aura.current) {
      const p = 1 + Math.sin(t * 2.0) * 0.04;
      aura.current.scale.setScalar(p);
    }
    // 미리보기에서 자체 회전
    if (animated && root.current) {
      root.current.rotation.y += dt * 0.6;
    }
  });

  // ---- 본체 색 (감정색을 본체에 살짝 반영, 단계가 높을수록 진해짐) ----
  const bodyColor = mix("#f6f3ff", soulColor, 0.08 + (stage - 1) * 0.04);
  const cheekColor = mix("#ff8db8", soulColor, 0.25);
  const haloColor = mix("#fff1c4", soulColor, 0.35);

  return (
    <group ref={root}>
      {/* === 본체 === */}
      <mesh ref={body} castShadow position={[0, 0, 0]}>
        <sphereGeometry args={[r, 40, 40]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={soulColor}
          emissiveIntensity={spec.bodyEmissive}
          roughness={0.32}
          metalness={0.05}
        />
      </mesh>

      {/* === 영혼 코어 (내부 글래스 시그니처 유지) === */}
      <mesh>
        <icosahedronGeometry args={[r * spec.coreScale, 2]} />
        <meshPhysicalMaterial
          color={soulColor}
          emissive={soulColor}
          emissiveIntensity={0.9}
          transmission={0.55}
          thickness={0.4}
          ior={1.4}
          roughness={0.2}
          clearcoat={1}
          transparent
        />
      </mesh>

      {/* === 눈 (단계 2+) === */}
      {spec.showEyes && (
        <group>
          <mesh position={[-r * 0.35, r * 0.18, r * 0.86]}>
            <sphereGeometry args={[r * 0.13, 10, 10]} />
            <meshBasicMaterial color={"#1a1730"} />
          </mesh>
          <mesh position={[r * 0.35, r * 0.18, r * 0.86]}>
            <sphereGeometry args={[r * 0.13, 10, 10]} />
            <meshBasicMaterial color={"#1a1730"} />
          </mesh>
          {/* 눈 하이라이트 */}
          <mesh position={[-r * 0.32, r * 0.22, r * 0.93]}>
            <sphereGeometry args={[r * 0.04, 6, 6]} />
            <meshBasicMaterial color={"#ffffff"} />
          </mesh>
          <mesh position={[r * 0.38, r * 0.22, r * 0.93]}>
            <sphereGeometry args={[r * 0.04, 6, 6]} />
            <meshBasicMaterial color={"#ffffff"} />
          </mesh>
        </group>
      )}

      {/* === 뺨 홍조 (단계 3+) === */}
      {spec.showCheeks && (
        <group>
          <mesh position={[-r * 0.6, r * 0.0, r * 0.7]}>
            <sphereGeometry args={[r * 0.14, 10, 10]} />
            <meshBasicMaterial color={cheekColor} transparent opacity={0.55} />
          </mesh>
          <mesh position={[r * 0.6, r * 0.0, r * 0.7]}>
            <sphereGeometry args={[r * 0.14, 10, 10]} />
            <meshBasicMaterial color={cheekColor} transparent opacity={0.55} />
          </mesh>
        </group>
      )}

      {/* === 팔 (작은 공 두 개, 단계 3+) === */}
      {spec.showArms && (
        <group>
          <mesh position={[-r * 1.05, -r * 0.1, 0]} castShadow>
            <sphereGeometry args={[r * 0.28, 16, 16]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} />
          </mesh>
          <mesh position={[r * 1.05, -r * 0.1, 0]} castShadow>
            <sphereGeometry args={[r * 0.28, 16, 16]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* === 새싹 (단계 2~3, 머리 위) === */}
      {spec.showSprout && (
        <group position={[0, r * 1.1, 0]}>
          {/* 줄기 */}
          <mesh position={[0, r * 0.18, 0]}>
            <cylinderGeometry args={[r * 0.045, r * 0.06, r * 0.36, 6]} />
            <meshStandardMaterial color={"#5fa86a"} />
          </mesh>
          {/* 떡잎 두 장 */}
          <mesh position={[-r * 0.18, r * 0.38, 0]} rotation={[0, 0, -0.6]}>
            <sphereGeometry args={[r * 0.16, 10, 10]} />
            <meshStandardMaterial color={"#7ed896"} flatShading />
          </mesh>
          <mesh position={[r * 0.18, r * 0.38, 0]} rotation={[0, 0, 0.6]}>
            <sphereGeometry args={[r * 0.16, 10, 10]} />
            <meshStandardMaterial color={"#7ed896"} flatShading />
          </mesh>
        </group>
      )}

      {/* === 꽃잎 머리띠 (단계 4+) === */}
      {spec.showPetals && (
        <group position={[0, r * 0.95, 0]}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55]}
                rotation={[0, -a, Math.PI * 0.18]}
              >
                <sphereGeometry args={[r * 0.18, 10, 10]} />
                <meshStandardMaterial
                  color={haloColor}
                  emissive={haloColor}
                  emissiveIntensity={0.35}
                  flatShading
                />
              </mesh>
            );
          })}
          {/* 중심 보석 */}
          <mesh position={[0, r * 0.08, 0]}>
            <icosahedronGeometry args={[r * 0.12, 1]} />
            <meshPhysicalMaterial
              color={soulColor}
              emissive={soulColor}
              emissiveIntensity={0.7}
              transmission={0.4}
              roughness={0.15}
            />
          </mesh>
        </group>
      )}

      {/* === 후광 (단계 5+) === */}
      {spec.showHalo && (
        <mesh ref={halo} position={[0, r * 1.35, 0]} rotation={[Math.PI / 2.1, 0, 0]}>
          <torusGeometry args={[r * 1.05, r * 0.08, 12, 40]} />
          <meshStandardMaterial
            color={haloColor}
            emissive={haloColor}
            emissiveIntensity={1.4}
            roughness={0.15}
            metalness={0.6}
          />
        </mesh>
      )}

      {/* === 망토 (단계 6+) === */}
      {spec.showCape && (
        <mesh position={[0, -r * 0.55, -r * 0.35]} rotation={[-0.35, 0, 0]}>
          <coneGeometry args={[r * 1.1, r * 1.3, 12, 1, true]} />
          <meshStandardMaterial
            color={mix(soulColor, "#3a2d6e", 0.4)}
            emissive={soulColor}
            emissiveIntensity={0.15}
            roughness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* === 별 왕관 (단계 6+) === */}
      {spec.showCrown && (
        <group ref={crownGrp} position={[0, r * 1.85, 0]}>
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55]}
                rotation={[0, -a, 0]}
              >
                <octahedronGeometry args={[r * 0.18, 0]} />
                <meshStandardMaterial
                  color={"#fff1a8"}
                  emissive={"#ffd56a"}
                  emissiveIntensity={1.4}
                  metalness={0.7}
                  roughness={0.2}
                  flatShading
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* === 오라 셸 (단계 5+) === */}
      {spec.showAura && (
        <mesh ref={aura}>
          <sphereGeometry args={[r * spec.auraSize, 24, 24]} />
          <meshBasicMaterial
            color={haloColor}
            transparent
            opacity={0.08 + (stage - 5) * 0.025}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

// 두 hex 색을 t (0~1)로 섞기
function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bb = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${[r, g, bb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function parseHex(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
