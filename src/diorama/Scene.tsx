// R3F Canvas 합성 (디오라마)
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Planet } from "./Planet";
import { CameraRig } from "./CameraRig";
import { EmotionParticles } from "@/glass-momo/EmotionParticles";

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1.05, 6.6], fov: 52, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      shadows
    >
      <ambientLight color={0xb8b0e8} intensity={0.55} />
      <directionalLight color={0xffffff} intensity={1.3} position={[3, 4, 5]} castShadow />
      <directionalLight color={0xa394f7} intensity={0.7} position={[-4, -1, -3]} />
      <Stars radius={32} depth={14} count={520} factor={1.2} fade speed={0.3} />
      <CameraRig />
      <Planet />
      {/* 감정 버튼 burst 입자 재사용 */}
      <EmotionParticles />
    </Canvas>
  );
}
