import { useCallback, useEffect, useRef, useState } from "react";
import type { T } from "@/lib/ops/i18n";
import type { Lang } from "@/lib/ops/types";

/**
 * Load data and refresh it every `ms` while the page is visible, so the office
 * board and the customer's status move on their own.
 */
export function usePoll<D>(load: () => Promise<D>, ms: number) {
  const [data, setData] = useState<D | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const refresh = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ops:server");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, refresh]);
  return { data, error, refresh };
}

/** Error code from the server → a sentence the person can act on. */
export function errorText(t: T, code: string | null): string | null {
  if (!code) return null;
  return code === "ops:forbidden" ? t("forbidden") : t("error");
}

/**
 * A per-device language choice (driver, office), or null until the person picks one —
 * then the caller falls back to the language saved on their profile. Best effort only.
 */
export function useStoredLang(key: string): [Lang | null, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang | null>(null);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      if (v === "ar" || v === "he") setLang(v);
    } catch {
      // Storage blocked (private mode): the profile language still applies.
    }
  }, [key]);
  const set = useCallback(
    (l: Lang) => {
      setLang(l);
      try {
        window.localStorage.setItem(key, l);
      } catch {
        // Not persisted; the choice still applies for this visit.
      }
    },
    [key],
  );
  return [lang, set];
}
