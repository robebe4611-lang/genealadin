import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { CHAPTERS, type Mode } from "@/lib/presentation/chapters";
import { CLAUDE_BRIEF } from "@/lib/presentation/claude-brief";
import { BriefPanel } from "@/components/stage/BriefPanel";
import { Hud } from "@/components/stage/Hud";
import { Schematic2D } from "@/components/stage/Schematic2D";

const StageCanvas = lazy(async () => {
  const m = await import("@/components/stage/StageCanvas");
  return { default: m.StageCanvas };
});

export function Presentation() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("3d");
  const [auto, setAuto] = useState(false);
  const [copied, setCopied] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [internal, setInternal] = useState(false);
  const last = CHAPTERS.length - 1;

  useEffect(() => {
    setReady(true);
    setInternal(new URLSearchParams(window.location.search).has("internal"));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const go = useCallback((i: number) => {
    const n = CHAPTERS.length;
    setIndex(((i % n) + n) % n);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (briefOpen) {
        if (e.key === "Escape") setBriefOpen(false);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === " ") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowRight") {
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [briefOpen, go, index]);

  useEffect(() => {
    if (!auto || briefOpen) return;
    const id = window.setInterval(() => go(index + 1), 7000);
    return () => window.clearInterval(id);
  }, [auto, briefOpen, go, index]);

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(CLAUDE_BRIEF);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    setBriefOpen(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-void text-cream">
      <div className="absolute inset-0">
        {mode === "2d" ? (
          <div className="h-full w-full" onClick={() => go(index + 1)}>
            <Schematic2D index={index} />
          </div>
        ) : ready ? (
          <Suspense fallback={<div className="h-full w-full bg-void" />}>
            <StageCanvas
              index={index}
              reduced={reduced}
              onAdvance={() => go(index + 1)}
            />
          </Suspense>
        ) : (
          <div className="h-full w-full bg-void" />
        )}
      </div>
      <div className="vignette pointer-events-none absolute inset-0" />
      <Hud
        index={index}
        mode={mode}
        auto={auto}
        copied={copied}
        showBrief={internal}
        onIndex={go}
        onMode={setMode}
        onAuto={() => setAuto((v) => !v)}
        onCopy={() => void copyBrief()}
      />
      <BriefPanel
        open={internal && briefOpen}
        copied={copied}
        onClose={() => setBriefOpen(false)}
        onCopy={() => void copyBrief()}
      />
      <p className="pointer-events-none absolute bottom-4 left-4 hidden font-body text-xs text-muted md:block">
        {String(index).padStart(2, "0")} / {String(last).padStart(2, "0")}
      </p>
    </div>
  );
}
