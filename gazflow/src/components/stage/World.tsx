import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import type { CameraPose } from "@/lib/presentation/chapters";
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

/** How fast the camera settles on a new pose: the presentation snaps between beats, the pitch film glides. */
const CAMERA_LAMBDA = 2.4;

function CameraRig({
  cam,
  reduced,
  lambda,
  snap,
}: {
  cam: CameraPose;
  reduced: boolean;
  lambda: number;
  snap?: number;
}) {
  const look = useRef(new THREE.Vector3(0, 0.4, 0));
  // Each new `snap` value cuts straight to the pose instead of gliding (used when the film seeks).
  const pendingSnap = useRef(snap !== undefined);
  useEffect(() => {
    if (snap !== undefined) pendingSnap.current = true;
  }, [snap]);
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
    const [lx, ly, lz] = cam.look;
    const reach = THREE.MathUtils.clamp(
      AUTHORED_ASPECT / (state.size.width / state.size.height),
      1,
      MAX_REACH,
    );
    const px = lx + (cam.pos[0] - lx) * reach;
    const py = ly + (cam.pos[1] - ly) * reach;
    const pz = lz + (cam.pos[2] - lz) * reach;
    const k = reduced ? 20 : lambda;
    if (pendingSnap.current) {
      pendingSnap.current = false;
      state.camera.position.set(px, py, pz);
      look.current.set(lx, ly, lz);
      state.camera.lookAt(look.current);
      return;
    }
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

/** Market beat: roughly 60 LPG suppliers (State Comptroller, 2026), four of them large. */
const MARKET_SUPPLIERS = 60;
const MARKET_BIG = new Set([7, 19, 33, 48]);
const MARKET_TRUCKS_PER_SUPPLIER = 3;
/** How far the diorama sinks into the disc while the market map is up. */
const MARKET_SINK = -3.2;

/** Deterministic pseudo-random (mulberry32) so the map looks the same on every render. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const ramp = (t: number, start: number, length: number) =>
  THREE.MathUtils.clamp((t - start) / length, 0, 1);

/**
 * Suppliers appear as dots, the four large ones grow copper, then the trucks under them fill in.
 * Frustum culling is off: the instances start at zero scale, so a bounding sphere computed then is wrong.
 */
function MarketMap({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dots = useRef<THREE.InstancedMesh>(null);
  const trucks = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const layout = useMemo(() => {
    const rand = seeded(2026);
    const suppliers = Array.from({ length: MARKET_SUPPLIERS }, () => {
      const r = 1.3 + Math.sqrt(rand()) * 5.6;
      const a = rand() * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r] as const;
    });
    const fleet = suppliers.flatMap(([x, z]) =>
      Array.from({ length: MARKET_TRUCKS_PER_SUPPLIER }, () => {
        const r = 0.32 + rand() * 0.3;
        const a = rand() * Math.PI * 2;
        return [x + Math.cos(a) * r, z + Math.sin(a) * r, a] as const;
      }),
    );
    return { suppliers, fleet };
  }, []);

  useLayoutEffect(() => {
    const big = new THREE.Color(P.flame);
    const small = new THREE.Color(P.muted);
    layout.suppliers.forEach((_, i) => {
      dots.current?.setColorAt(i, MARKET_BIG.has(i) ? big : small);
    });
    if (dots.current?.instanceColor) dots.current.instanceColor.needsUpdate = true;
  }, [layout]);

  useFrame((_, delta) => {
    elapsed.current = active ? elapsed.current + Math.min(delta, 0.08) : 0;
    const t = elapsed.current;
    if (group.current) group.current.visible = active;
    if (!active) return;
    layout.suppliers.forEach(([x, z], i) => {
      const grow = MARKET_BIG.has(i) ? 1 + 1.6 * ramp(t, 3.4, 0.7) : 1;
      tmp.position.set(x, 0.04, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.setScalar(Math.max(1e-4, ramp(t, 0.8 + i * 0.025, 0.35) * grow));
      tmp.updateMatrix();
      dots.current?.setMatrixAt(i, tmp.matrix);
    });
    layout.fleet.forEach(([x, z, a], i) => {
      tmp.position.set(x, 0.05, z);
      tmp.rotation.set(0, a, 0);
      tmp.scale.setScalar(Math.max(1e-4, ramp(t, 5.6 + i * 0.008, 0.3)));
      tmp.updateMatrix();
      trucks.current?.setMatrixAt(i, tmp.matrix);
    });
    if (dots.current) dots.current.instanceMatrix.needsUpdate = true;
    if (trucks.current) trucks.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} visible={false}>
      <instancedMesh
        ref={dots}
        args={[undefined, undefined, MARKET_SUPPLIERS]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.13, 0.13, 0.06, 16]} />
        <meshStandardMaterial roughness={0.5} emissive={P.flame} emissiveIntensity={0.12} />
      </instancedMesh>
      <instancedMesh
        ref={trucks}
        args={[undefined, undefined, MARKET_SUPPLIERS * MARKET_TRUCKS_PER_SUPPLIER]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.24, 0.12, 0.12]} />
        <meshStandardMaterial color={P.cream} roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

const RESERVE_SHARE = 0.34;
/**
 * A text label pinned to a point in the scene. In this RTL document drei's absolutely positioned
 * label box resolves to the left of its anchor, so it is pinned with `left-0` and centers itself.
 */
function SceneLabel({
  position,
  children,
}: {
  position: [number, number, number];
  children: string;
}) {
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

/**
 * The diorama. `beat` selects what the scene shows: a chapter id from the presentation, or one of the
 * pitch-film states ("hook", "before", "market"). Unknown beats show the machine at rest.
 */
export function World({
  beat,
  cam,
  reduced,
  cameraLambda = CAMERA_LAMBDA,
  cameraSnap,
}: {
  beat: string;
  cam: CameraPose;
  reduced: boolean;
  cameraLambda?: number;
  /** Change this value to cut the camera straight to `cam`. */
  cameraSnap?: number;
}) {
  const id = beat;
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
  const diorama = useRef<THREE.Group>(null);
  const phone = useRef<THREE.MeshStandardMaterial>(null);

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

    // "before": the truck shuttles back and forth on a route nobody planned.
    const shuttle = 0.15 + 0.5 * (1 - Math.abs(((t * 0.1) % 2) - 1));
    const tu = id === "route" ? (t * 0.14) % 1 : id === "before" ? shuttle : 0.35;
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
        id === "order" || id === "loop" ? 0.9 : id === "before" ? 0.02 : 0.12,
        4,
        d,
      );
    }

    if (diorama.current) {
      diorama.current.position.y = damp(
        diorama.current.position.y,
        id === "market" ? MARKET_SINK : 0,
        reduced ? 16 : 1.6,
        d,
      );
      diorama.current.visible = diorama.current.position.y > MARKET_SINK + 0.05;
    }

    // "before": the office phone rings in bursts — a fast blink for 1.2 s, then 0.8 s of quiet.
    if (phone.current) {
      const ringing = id === "before" && t % 2 < 1.2;
      phone.current.emissiveIntensity = ringing && Math.sin(t * 28) > 0 ? 2.2 : 0.05;
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
      <CameraRig cam={cam} reduced={reduced} lambda={cameraLambda} snap={cameraSnap} />
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
      <MarketMap active={id === "market"} />
      <group ref={diorama}>
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
        {id === "order" && <SceneLabel position={[2.0, 0.6, -2.5]}>נכשל → מחר / ביטול</SceneLabel>}

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
              ...SILOS.map(({ x, label }) => ({
                key: label,
                pos: [x, -0.05, 0.75] as const,
                label,
              })),
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

        <mesh position={[-3.05, 1.25, -0.2]} visible={id === "before"}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial
            ref={phone}
            color={P.ember}
            emissive={P.ember}
            emissiveIntensity={0.05}
          />
        </mesh>
      </group>

      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={id === "market" ? 0 : 0.42}
        scale={14}
        blur={2.4}
        far={8}
        color="#000000"
      />
    </>
  );
}
