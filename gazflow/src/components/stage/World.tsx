import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { CHAPTERS } from "@/lib/presentation/chapters";
import { P } from "@/lib/presentation/palette";
import {
  House,
  MoneyPedestals,
  Protagonist,
  StageDisc,
  Truck,
  Warehouse,
} from "@/components/stage/meshes";

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

/** Camera poses are authored for a ~16:10 screen; narrower screens pull back so the diorama still fits. */
const AUTHORED_ASPECT = 1.5;
const MAX_REACH = 1.6;
/** On portrait screens the HUD covers the lower half, so the scene is lifted by this share of the height. */
const PORTRAIT_LIFT = 0.17;

function CameraRig({ index, reduced }: { index: number; reduced: boolean }) {
  const look = useRef(new THREE.Vector3(0, 0.4, 0));
  const camera = useThree((s) => s.camera);
  const { width, height } = useThree((s) => s.size);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (width < height) {
      camera.setViewOffset(width, height, 0, height * PORTRAIT_LIFT, width, height);
    } else {
      camera.clearViewOffset();
    }
  }, [camera, width, height]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.08);
    const ch = CHAPTERS[index] ?? CHAPTERS[0];
    const [lx, ly, lz] = ch.cam.look;
    const reach = THREE.MathUtils.clamp(
      AUTHORED_ASPECT / (state.size.width / state.size.height),
      1,
      MAX_REACH,
    );
    const px = lx + (ch.cam.pos[0] - lx) * reach;
    const py = ly + (ch.cam.pos[1] - ly) * reach;
    const pz = lz + (ch.cam.pos[2] - lz) * reach;
    const k = reduced ? 20 : 2.4;
    state.camera.position.x = damp(state.camera.position.x, px, k, d);
    state.camera.position.y = damp(state.camera.position.y, py, k, d);
    state.camera.position.z = damp(state.camera.position.z, pz, k, d);
    look.current.x = damp(look.current.x, lx, k, d);
    look.current.y = damp(look.current.y, ly, k, d);
    look.current.z = damp(look.current.z, lz, k, d);
    state.camera.lookAt(look.current);
  });
  return null;
}

const RESERVE_SHARE = 0.34;
/**
 * A text label pinned to a point in the scene. In this RTL document drei's absolutely positioned
 * label box resolves to the left of its anchor, so it is pinned with `left-0` and centers itself.
 */
function SceneLabel({ position, children }: { position: [number, number, number]; children: string }) {
  return (
    <Html position={position} className="pointer-events-none left-0">
      <span className="block w-max -translate-x-1/2 -translate-y-1/2 font-body text-xs text-cream">
        {children}
      </span>
    </Html>
  );
}
const SILOS = [
  { x: -0.9, label: "מחסן", color: P.good },
  { x: 0.9, label: "רכב", color: P.ember },
] as const;

export function World({ index, reduced }: { index: number; reduced: boolean }) {
  const id = CHAPTERS[index]?.id ?? "loop";
  const cyl = useRef<THREE.Group>(null);
  const truck = useRef<THREE.Group>(null);
  const silos = useRef<THREE.Group>(null);
  const money = useRef<THREE.Group>(null);
  const clock = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const fills = useRef<[THREE.Mesh | null, THREE.Mesh | null]>([null, null]);
  const reserve = useRef<THREE.Mesh>(null);
  const branchMat = useRef<THREE.MeshStandardMaterial>(null);
  const railMat = useRef<THREE.MeshStandardMaterial>(null);
  const tRef = useRef(0);

  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.4, 0.55, -0.35),
        new THREE.Vector3(-1.6, 0.55, 1.5),
        new THREE.Vector3(0.3, 0.55, 1.7),
        new THREE.Vector3(2.2, 0.55, 0.4),
        new THREE.Vector3(3.8, 0.55, -1.35),
      ]),
    [],
  );
  const truckPath = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.8, 0, 1.8),
        new THREE.Vector3(0.4, 0, 1.5),
        new THREE.Vector3(2.2, 0, 0.6),
        new THREE.Vector3(3.6, 0, -0.8),
      ]),
    [],
  );
  const railGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.2, 0.08, 1.8),
      new THREE.Vector3(-1.4, 0.08, 2.4),
      new THREE.Vector3(0.2, 0.08, 1.6),
      new THREE.Vector3(1.6, 0.08, 0.2),
      new THREE.Vector3(3.1, 0.08, -0.6),
      new THREE.Vector3(4.2, 0.08, -1.6),
    ]);
    return new THREE.TubeGeometry(curve, 64, 0.045, 8, false);
  }, []);
  // Off-rail exit for a failed attempt: it leads to "tomorrow" or "cancelled", never back to delivered.
  const branchGeo = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(3.1, 0.08, -0.6),
      new THREE.Vector3(2.9, 0.08, -1.7),
      new THREE.Vector3(2.0, 0.08, -2.5),
    );
    return new THREE.TubeGeometry(curve, 24, 0.035, 8, false);
  }, []);
  const arcGeo = useMemo(() => {
    const c = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-4.1, 1.6, -1.1),
      new THREE.Vector3(0.2, 3.6, 0.4),
      new THREE.Vector3(3.6, 1.4, -1.4),
    );
    return { c, geo: new THREE.TubeGeometry(c, 48, 0.03, 8, false) };
  }, []);

  useLayoutEffect(() => {
    cyl.current?.position.set(-3.4, 0.55, -0.35);
    truck.current?.position.set(0.2, 0, 1.6);
    [silos.current, money.current, clock.current].forEach((g) => {
      if (!g) return;
      g.scale.setScalar(0.0001);
      g.visible = false;
    });
  }, []);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.08);
    tRef.current += d;
    const t = tRef.current;
    const k = reduced ? 16 : 3.2;

    const u =
      id === "order" || id === "loop" || id === "build"
        ? (t * (id === "order" ? 0.12 : 0.06)) % 1
        : id === "route"
          ? (t * 0.1) % 1
          : 0.16;
    const p = path.getPoint(u);
    if (cyl.current) {
      cyl.current.position.x = damp(cyl.current.position.x, p.x, k, d);
      cyl.current.position.y = damp(cyl.current.position.y, p.y, k, d);
      cyl.current.position.z = damp(cyl.current.position.z, p.z, k, d);
    }

    const tu = id === "route" ? (t * 0.14) % 1 : 0.35;
    const tp = truckPath.getPoint(tu);
    const tp2 = truckPath.getPoint(Math.min(0.99, tu + 0.04));
    if (truck.current) {
      truck.current.position.x = damp(truck.current.position.x, tp.x, k, d);
      truck.current.position.z = damp(truck.current.position.z, tp.z, k, d);
      const target = Math.atan2(tp.x - tp2.x, tp.z - tp2.z);
      truck.current.rotation.y = damp(truck.current.rotation.y, target, 4, d);
    }

    const setScale = (g: THREE.Group | null, on: boolean) => {
      if (!g) return;
      const s = damp(g.scale.x, on ? 1 : 0.0001, 6, d);
      g.scale.setScalar(s);
      g.visible = s > 0.04;
    };
    setScale(silos.current, id === "stock");
    setScale(money.current, id === "money");
    setScale(clock.current, id === "clock");

    if (railMat.current) {
      railMat.current.emissiveIntensity = damp(
        railMat.current.emissiveIntensity,
        id === "order" || id === "loop" ? 0.9 : 0.12,
        4,
        d,
      );
    }

    if (branchMat.current) {
      branchMat.current.emissiveIntensity = damp(
        branchMat.current.emissiveIntensity,
        id === "order" ? 0.9 : 0.05,
        4,
        d,
      );
    }

    if (id === "stock") {
      const levels = [0.82, 0.42 + Math.sin(t) * 0.08];
      fills.current.forEach((mesh, i) => {
        if (!mesh) return;
        const h = Math.max(0.1, levels[i] * 1.9);
        mesh.scale.y = damp(mesh.scale.y, h, 3, d);
        mesh.position.y = 0.12 + mesh.scale.y / 2;
      });
      // The reserve is a lock on the top of the warehouse stock, not a separate pile.
      const wh = fills.current[0];
      if (wh && reserve.current) {
        reserve.current.scale.y = wh.scale.y * RESERVE_SHARE;
        // A hair above the fill so the two top caps don't z-fight.
        reserve.current.position.y = 0.125 + wh.scale.y - reserve.current.scale.y / 2;
      }
    }

    if (pulse.current) {
      pulse.current.visible = id === "ping";
      if (id === "ping") {
        const uArc = (t * 0.28) % 1;
        const q = arcGeo.c.getPoint(uArc);
        pulse.current.position.copy(q);
      }
    }

    if (clock.current) {
      clock.current.rotation.x = -Math.PI / 2;
      clock.current.rotation.z = t * 0.25;
    }
  });

  return (
    <>
      <CameraRig index={index} reduced={reduced} />
      <color attach="background" args={[P.void]} />
      <fog attach="fog" args={[P.void, 12, 28]} />
      <hemisphereLight args={[P.slate, P.void, 0.55]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.35}
        color={P.cream}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-3, 3, -2]} intensity={1.1} color={P.flame} distance={12} />
      <StageDisc />
      <Warehouse active={id === "actors" || id === "loop"} />
      <House position={[3.7, 0, -1.55]} lit={id === "actors" || id === "ping" || id === "loop"} />
      <House position={[5.05, 0, -0.15]} lit={id === "route" || id === "actors"} />
      <House position={[3.35, 0, 1.15]} lit={id === "route"} />

      <group ref={truck}>
        <Truck active={id === "route" || id === "actors"} />
      </group>

      <group ref={cyl}>
        <Protagonist />
      </group>

      <mesh geometry={railGeo}>
        <meshStandardMaterial
          ref={railMat}
          color={P.flame}
          emissive={P.flame}
          emissiveIntensity={0.2}
          roughness={0.35}
        />
      </mesh>

      <mesh geometry={branchGeo} visible={id === "order"}>
        <meshStandardMaterial
          ref={branchMat}
          color={P.bad}
          emissive={P.bad}
          emissiveIntensity={0.05}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[2.0, 0.1, -2.5]} visible={id === "order"}>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 16]} />
        <meshStandardMaterial color={P.bad} emissive={P.bad} emissiveIntensity={0.8} />
      </mesh>
      {id === "order" && (
        <SceneLabel position={[2.0, 0.6, -2.5]}>נכשל → מחר / ביטול</SceneLabel>
      )}

      <group ref={silos} position={[0, 0, -0.2]}>
        {SILOS.map(({ x, color }, i) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 1.15, 0]}>
              <cylinderGeometry args={[0.42, 0.48, 2.3, 20]} />
              <meshStandardMaterial
                color={P.navy}
                roughness={0.55}
                metalness={0.25}
                transparent
                opacity={0.45}
                depthWrite={false}
              />
            </mesh>
            <mesh
              ref={(el) => {
                fills.current[i] = el;
              }}
              position={[0, 0.6, 0]}
            >
              <cylinderGeometry args={[0.32, 0.32, 1, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
            </mesh>
          </group>
        ))}
        <group position={[SILOS[0].x, 0, 0]}>
          <mesh ref={reserve} position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.345, 0.345, 1, 16]} />
            <meshStandardMaterial color={P.wait} emissive={P.wait} emissiveIntensity={0.6} />
          </mesh>
        </group>
        {id === "stock" &&
          [
            ...SILOS.map(({ x, label }) => ({ key: label, pos: [x, -0.05, 0.75] as const, label })),
            { key: "reserve", pos: [SILOS[0].x, 2.6, 0] as const, label: "רזרבה = מנעול" },
          ].map(({ key, pos, label }) => (
            <SceneLabel key={key} position={[pos[0], pos[1], pos[2]]}>
              {label}
            </SceneLabel>
          ))}
      </group>

      <group ref={money} position={[0, 0, 1.35]}>
        <MoneyPedestals visible={1} />
      </group>

      <mesh geometry={arcGeo.geo}>
        <meshStandardMaterial
          color={P.cream}
          emissive={P.cream}
          emissiveIntensity={id === "ping" ? 0.28 : 0.05}
          transparent
          opacity={id === "ping" ? 0.7 : 0.12}
        />
      </mesh>
      <mesh ref={pulse} visible={false}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color={P.ember} emissive={P.ember} emissiveIntensity={1.4} />
      </mesh>

      <group ref={clock} position={[0, 0.06, 0]}>
        <mesh>
          <ringGeometry args={[2.15, 2.45, 64]} />
          <meshStandardMaterial color={P.slate} emissive={P.cream} emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[2.28, 0, 0]}>
          <circleGeometry args={[0.12, 12]} />
          <meshStandardMaterial color={P.flame} emissive={P.flame} emissiveIntensity={0.9} />
        </mesh>
      </group>

      <ContactShadows position={[0, 0.02, 0]} opacity={0.42} scale={14} blur={2.4} far={8} color="#000000" />
    </>
  );
}
