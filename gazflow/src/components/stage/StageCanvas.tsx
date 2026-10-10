import { Canvas } from "@react-three/fiber";
import { World } from "@/components/stage/World";
import type { CameraPose } from "@/lib/presentation/chapters";

export function StageCanvas({
  beat,
  cam,
  reduced,
  cameraLambda,
  cameraSnap,
  frameloop = "always",
  onAdvance,
}: {
  beat: string;
  cam: CameraPose;
  reduced: boolean;
  cameraLambda?: number;
  cameraSnap?: number;
  /** "never" hands frame timing to the caller (`advance`), for frame-exact video capture. */
  frameloop?: "always" | "never";
  onAdvance?: () => void;
}) {
  return (
    <Canvas
      shadows
      frameloop={frameloop}
      dpr={[1, 1.75]}
      camera={{ position: [7.4, 5.8, 7.6], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onClick={onAdvance}
    >
      <World
        beat={beat}
        cam={cam}
        reduced={reduced}
        cameraLambda={cameraLambda}
        cameraSnap={cameraSnap}
      />
    </Canvas>
  );
}
