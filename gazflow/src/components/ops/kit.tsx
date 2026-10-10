import type { ReactNode } from "react";
import { makeT } from "@/lib/ops/i18n";
import type { Lang } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

/** Page frame for the operations app: light, RTL, Rubik, in the person's language. */
export function OpsShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <div
      lang={lang}
      dir="rtl"
      className="min-h-dvh bg-paper font-ops text-ink antialiased"
      style={{ fontFamily: "var(--font-ops)" }}
    >
      {children}
    </div>
  );
}

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      className="flex rounded-full bg-card p-1 shadow-[0_0_0_1px_var(--color-line)]"
      role="group"
    >
      {(["ar", "he"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={cn(
            "min-h-11 rounded-full px-4 text-base font-medium transition-colors",
            lang === l ? "bg-ink text-paper" : "text-soft",
          )}
        >
          {makeT(l)("langName")}
        </button>
      ))}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn("rounded-3xl bg-card p-5 shadow-[0_0_0_1px_var(--color-line)]", className)}
    >
      {children}
    </section>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-lg font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="+"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="size-14 rounded-2xl bg-paper text-3xl font-bold shadow-[0_0_0_1px_var(--color-line)]"
        >
          +
        </button>
        <span className="w-10 text-center text-3xl font-bold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label="−"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="size-14 rounded-2xl bg-paper text-3xl font-bold shadow-[0_0_0_1px_var(--color-line)]"
        >
          −
        </button>
      </div>
    </div>
  );
}

export function Choice<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-14 rounded-2xl px-3 text-lg font-medium shadow-[0_0_0_1px_var(--color-line)]",
            value === o.value ? "bg-ink text-paper" : "bg-paper",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
