import {
  Box,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Pause,
  Play,
} from "lucide-react";
import { CHAPTERS, type Mode } from "@/lib/presentation/chapters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hud({
  index,
  mode,
  auto,
  copied,
  onIndex,
  onMode,
  onAuto,
  onCopy,
}: {
  index: number;
  mode: Mode;
  auto: boolean;
  copied: boolean;
  onIndex: (i: number) => void;
  onMode: (m: Mode) => void;
  onAuto: () => void;
  onCopy: () => void;
}) {
  const ch = CHAPTERS[index] ?? CHAPTERS[0];
  const last = CHAPTERS.length - 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-7">
      <header className="pointer-events-auto flex items-start justify-between gap-3">
        <div>
          <p className="font-body text-xs font-medium tracking-[0.18em] text-flame">גזפלו</p>
          <p className="font-display text-lg text-cream md:text-xl">מכונת היום</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="max-md:px-2"
            onClick={() => onMode(mode === "3d" ? "2d" : "3d")}
            aria-label={mode === "3d" ? "עבור לתרשים" : "עבור לתלת־ממד"}
          >
            <Box />
            <span className="max-sm:hidden">{mode === "3d" ? "תרשים" : "תלת־ממד"}</span>
          </Button>
          <Button variant="secondary" size="sm" className="max-md:px-2" onClick={onCopy}>
            <ClipboardCopy />
            <span className="max-sm:hidden">{copied ? "הועתק" : "בריף"}</span>
          </Button>
        </div>
      </header>

      <div className="pointer-events-auto flex max-w-xl flex-col gap-4">
        <div key={ch.id} className="stagger-in">
          <p className="font-body text-xs font-semibold tracking-[0.16em] text-flame">
            {ch.kicker}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-cream text-balance md:text-5xl">
            {ch.title}
          </h1>
          <p className="mt-3 max-w-md font-body text-sm leading-normal text-muted text-pretty md:text-base">
            {ch.line}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {ch.chips.map((chip) => (
              <li
                key={chip}
                className="rounded-full bg-navy px-3 py-1 font-body text-xs text-cream shadow-border"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="הקודם"
            onClick={() => onIndex(index === 0 ? last : index - 1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="default"
            onClick={() => onIndex(index === last ? 0 : index + 1)}
          >
            {index === last ? "מההתחלה" : "הבא"}
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={auto ? "עצור" : "נגן"}
            onClick={onAuto}
          >
            {auto ? <Pause /> : <Play />}
          </Button>
          <ol className="ms-1 flex items-center gap-1.5">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-label={c.kicker}
                  onClick={() => onIndex(i)}
                  className={cn(
                    "block size-2.5 rounded-full transition-[transform,background-color] duration-150",
                    i === index ? "scale-125 bg-flame" : "bg-slate hover:bg-muted",
                  )}
                />
              </li>
            ))}
          </ol>
        </div>
        <p className="font-body text-xs text-muted">חצים / רווח · הקשה להמשך</p>
      </div>
    </div>
  );
}
