import { useMemo } from "react";
import { P } from "@/lib/presentation/palette";

export function StageDisc() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[8.4, 64]} />
        <meshStandardMaterial color={P.asphalt} roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[7.55, 7.72, 80]} />
        <meshStandardMaterial
          color={P.flame}
          emissive={P.flame}
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[4.9, 4.98, 80]} />
        <meshStandardMaterial color={P.slate} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Warehouse({ active }: { active: boolean }) {
  return (
    <group position={[-4.3, 0, -1.1]}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2.4, 1.9, 1.8]} />
        <meshStandardMaterial
          color={active ? P.navy : "#18222c"}
          roughness={0.7}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[1.15, 0.45, 0.2]} castShadow>
        <boxGeometry args={[0.5, 0.9, 1.1]} />
        <meshStandardMaterial color={P.slate} roughness={0.65} />
      </mesh>
      <mesh position={[0.2, 2.05, 0]}>
        <boxGeometry args={[1.1, 0.18, 0.7]} />
        <meshStandardMaterial
          color={P.flame}
          emissive={P.flame}
          emissiveIntensity={active ? 0.7 : 0.15}
        />
      </mesh>
    </group>
  );
}

export function House({
  position,
  lit,
}: {
  position: [number, number, number];
  lit: boolean;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.05, 1.1, 0.95]} />
        <meshStandardMaterial color={lit ? "#243140" : "#1a2430"} roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.28, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.82, 0.55, 4]} />
        <meshStandardMaterial color={P.navy} roughness={0.6} />
      </mesh>
      <mesh position={[0.28, 0.52, 0.48]}>
        <planeGeometry args={[0.28, 0.32]} />
        <meshStandardMaterial
          color={lit ? P.ember : "#3a2a18"}
          emissive={lit ? P.ember : "#000000"}
          emissiveIntensity={lit ? 1.1 : 0}
        />
      </mesh>
    </group>
  );
}

export function Truck({
  position,
  heading,
  active,
}: {
  position: [number, number, number];
  heading: number;
  active: boolean;
}) {
  return (
    <group position={position} rotation={[0, heading, 0]}>
      <mesh position={[0.15, 0.42, 0]} castShadow>
        <boxGeometry args={[1.35, 0.48, 0.72]} />
        <meshStandardMaterial
          color={active ? P.flame : P.slate}
          roughness={0.45}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[-0.7, 0.52, 0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.7]} />
        <meshStandardMaterial color={P.cream} roughness={0.35} />
      </mesh>
      {[-0.55, 0.45].map((x) =>
        [-0.38, 0.38].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.16, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.12, 12]} />
            <meshStandardMaterial color="#12171c" roughness={0.9} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Protagonist({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.52, 6, 18]} />
        <meshStandardMaterial
          color={P.flame}
          metalness={0.42}
          roughness={0.28}
          emissive={P.flame}
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.035, 8, 18]} />
        <meshStandardMaterial color={P.cream} metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function Silos({ fills, visible }: { fills: [number, number, number]; visible: number }) {
  const labels = useMemo(() => [-1.6, 0, 1.6] as const, []);
  return (
    <group position={[0, 0, -0.2]} scale={visible}>
      {labels.map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.42, 0.48, 2.3, 20]} />
            <meshStandardMaterial
              color={P.navy}
              roughness={0.55}
              metalness={0.25}
              transparent
              opacity={0.9}
            />
          </mesh>
          <mesh position={[0, 0.15 + fills[i] * 0.95, 0]}>
            <cylinderGeometry args={[0.32, 0.32, Math.max(0.08, fills[i] * 1.9), 16]} />
            <meshStandardMaterial
              color={i === 2 ? P.wait : i === 1 ? P.ember : P.good}
              emissive={i === 2 ? P.wait : i === 1 ? P.ember : P.good}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function MoneyPedestals({ visible }: { visible: number }) {
  const items: Array<{ x: number; color: string }> = [
    { x: -1.35, color: P.good },
    { x: 0, color: P.muted },
    { x: 1.35, color: P.wait },
  ];
  return (
    <group position={[0, 0, 1.4]} scale={visible}>
      {items.map((it) => (
        <group key={it.x} position={[it.x, 0, 0]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.42, 0.48, 0.36, 6]} />
            <meshStandardMaterial color={P.navy} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[0.42, 0.28, 0.42]} />
            <meshStandardMaterial
              color={it.color}
              emissive={it.color}
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ClockRing({ progress, visible }: { progress: number; visible: number }) {
  return (
    <group position={[0, 0.05, 0]} scale={visible} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[2.15, 2.45, 64]} />
        <meshStandardMaterial
          color={P.slate}
          emissive={P.cream}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh rotation={[0, 0, progress * Math.PI * 2]}>
        <circleGeometry args={[0.12, 12]} />
        <meshStandardMaterial
          color={P.flame}
          emissive={P.flame}
          emissiveIntensity={0.9}
        />
      </mesh>
    </group>
  );
}
