import { Canvas } from "@react-three/fiber";
import { World } from "@/components/stage/World";

export function StageCanvas({
  index,
  reduced,
  onAdvance,
}: {
  index: number;
  reduced: boolean;
  onAdvance: () => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [7.4, 5.8, 7.6], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onClick={onAdvance}
    >
      <World index={index} reduced={reduced} />
    </Canvas>
  );
}
