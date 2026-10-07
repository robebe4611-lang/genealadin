import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { advance } from "@react-three/fiber";
import { Pause, Play } from "lucide-react";
import {
  activeAt,
  PITCH_LENGTH,
  PITCH_SCENES,
  PITCH_STARTS,
  sceneAt,
} from "@/lib/presentation/pitch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const StageCanvas = lazy(async () => {
  const m = await import("@/components/stage/StageCanvas");
  return { default: m.StageCanvas };
});

/** The film glides between shots; the presentation's 2.4 would read as cuts. */
const FILM_CAMERA_LAMBDA = 1.1;

type Cursor = { scene: number; shot: number; caption: number };

function cursorAt(time: number): Cursor {
  const scene = sceneAt(time);
  const local = time - PITCH_STARTS[scene];
  const { shots, captions } = PITCH_SCENES[scene];
  return {
    scene,
    shot: Math.max(0, activeAt(shots, local)),
    caption: activeAt(captions, local),
  };
}

/**
 * Plays the investor pitch as one continuous camera move (route `/pitch`).
 * `?scene=N` starts at scene N (1-based). `?record` hides the controls and stops the clock: the
 * capture script then drives the film frame by frame through `window.__pitch.step(seconds)`, so the
 * video is smooth however slowly this machine renders.
 * Keys: space play/pause, ← next scene, → previous scene (RTL).
 */
export function PitchPlayer() {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [cursor, setCursor] = useState<Cursor>({ scene: 0, shot: 0, caption: -1 });
  const [snap, setSnap] = useState(0);
  const time = useRef(0);
  const progress = useRef<HTMLDivElement>(null);

  const seek = useCallback((t: number) => {
    time.current = Math.min(Math.max(0, t), PITCH_LENGTH);
    setCursor(cursorAt(time.current));
    setSnap((n) => n + 1);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRecord(params.has("record"));
    const scene = Number(params.get("scene"));
    if (Number.isInteger(scene) && scene >= 1 && scene <= PITCH_SCENES.length) {
      seek(PITCH_STARTS[scene - 1]);
    }
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setReady(true);
  }, [seek]);

  useEffect(() => {
    if (!record) return;
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const api = {
      length: PITCH_LENGTH,
      time: () => time.current,
      step: async (dt: number) => {
        time.current = Math.min(PITCH_LENGTH, time.current + dt);
        setCursor(cursorAt(time.current));
        if (progress.current) {
          progress.current.style.transform = `scaleX(${time.current / PITCH_LENGTH})`;
        }
        // Let React and the three.js root commit the new props, then render exactly one frame.
        await frame();
        await frame();
        advance(time.current);
      },
    };
    Object.assign(window, { __pitch: api });
  }, [record]);

  useEffect(() => {
    if (!playing || record) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      time.current = Math.min(PITCH_LENGTH, time.current + (now - last) / 1000);
      last = now;
      if (progress.current) {
        progress.current.style.transform = `scaleX(${time.current / PITCH_LENGTH})`;
      }
      const next = cursorAt(time.current);
      setCursor((prev) =>
        prev.scene === next.scene && prev.shot === next.shot && prev.caption === next.caption
          ? prev
          : next,
      );
      if (time.current >= PITCH_LENGTH) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, record]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        seek(PITCH_STARTS[Math.min(cursor.scene + 1, PITCH_SCENES.length - 1)]);
      } else if (e.key === "ArrowRight") {
        seek(PITCH_STARTS[Math.max(cursor.scene - 1, 0)]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor.scene, seek]);

  const scene = PITCH_SCENES[cursor.scene];
  const shot = scene.shots[cursor.shot];
  const caption = cursor.caption >= 0 ? scene.captions[cursor.caption] : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-void text-cream">
      <div className="absolute inset-0">
        {ready ? (
          <Suspense fallback={<div className="h-full w-full bg-void" />}>
            <StageCanvas
              beat={shot.beat}
              cam={shot.cam}
              reduced={reduced}
              cameraLambda={FILM_CAMERA_LAMBDA}
              cameraSnap={snap}
              frameloop={record ? "never" : "always"}
              onAdvance={() => setPlaying((p) => !p)}
            />
          </Suspense>
        ) : (
          <div className="h-full w-full bg-void" />
        )}
      </div>
      <div className="vignette pointer-events-none absolute inset-0" />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-6 md:p-12"
        aria-live="polite"
      >
        <p
          key={scene.id}
          className="stagger-in font-body text-xs font-semibold tracking-[0.18em] text-flame"
        >
          <span>{scene.kicker}</span>
        </p>
        {caption && (
          <p
            key={`${scene.id}-${cursor.caption}`}
            className={cn(
              "kinetic max-w-4xl font-display leading-tight text-balance text-cream",
              caption.big ? "text-6xl md:text-8xl" : "text-3xl md:text-5xl",
            )}
          >
            {caption.text.split(" ").map((word, i) => (
              <span key={i} style={{ animationDelay: `${i * 70}ms` }}>
                {word}{" "}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-slate/40">
        <div ref={progress} className="h-full origin-right scale-x-0 bg-flame" />
      </div>

      {!record && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label={playing ? "עצור" : "נגן"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <p className="font-body text-xs text-muted">
            {String(cursor.scene + 1).padStart(2, "0")} / {PITCH_SCENES.length}
          </p>
        </div>
      )}
    </div>
  );
}
