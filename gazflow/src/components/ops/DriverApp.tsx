import { useMemo, useState } from "react";
import { Navigation, Phone } from "lucide-react";
import { driverDelivered, driverFailed, driverOnTheWay, getDriverDay } from "@/lib/ops/api";
import { makeT, shekel, type T } from "@/lib/ops/i18n";
import type { Lang, OrderView } from "@/lib/ops/types";
import { cn } from "@/lib/utils";
import { errorText, usePoll, useStoredLang } from "./hooks";
import { Card, Choice, LangToggle, OpsShell, Stepper } from "./kit";

type PayChoice = "cash" | "debt" | "transfer_claimed";
type FailReason = "no_one_home" | "wrong_address" | "refused";

/** The driver's day: next stops in route order, one big action per stop. */
export function DriverApp({ token }: { token: string }) {
  const { data, error, refresh } = usePoll(() => getDriverDay({ data: { token } }), 20_000);
  const [stored, setLang] = useStoredLang("gazflow-driver-lang");
  const lang: Lang = stored ?? data?.lang ?? "ar";
  const t = useMemo(() => makeT(lang), [lang]);
  const [problem, setProblem] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setProblem(null);
    } catch (err) {
      setProblem(errorText(t, err instanceof Error ? err.message : "ops:server"));
    }
    await refresh();
  };

  if (!data) {
    return (
      <OpsShell lang={lang}>
        <p className="p-8 text-center text-xl text-soft">{errorText(t, error) ?? "…"}</p>
      </OpsShell>
    );
  }

  const [next, ...later] = data.stops;

  return (
    <OpsShell lang={lang}>
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-5 pb-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-soft">{t("myDay")}</p>
            <h1 className="text-2xl font-bold">{data.name}</h1>
          </div>
          <LangToggle lang={lang} onChange={setLang} />
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat label={t("stopsLeft")} value={String(data.stops.length)} />
          <Stat label={t("cashInHand")} value={shekel(data.cash, lang)} />
        </div>

        {problem && (
          <p className="rounded-2xl bg-[#fde8e4] px-4 py-3 text-lg text-[#8c2b1a]">{problem}</p>
        )}

        {next ? (
          <StopCard
            key={next.id}
            t={t}
            lang={lang}
            stop={next}
            current
            onOnTheWay={() => run(() => driverOnTheWay({ data: { token, orderId: next.id } }))}
            onDelivered={(deliveredQty, collectedEmpties, payment) =>
              run(() =>
                driverDelivered({
                  data: { token, orderId: next.id, deliveredQty, collectedEmpties, payment },
                }),
              )
            }
            onFailed={(reason) =>
              run(() => driverFailed({ data: { token, orderId: next.id, reason } }))
            }
          />
        ) : (
          <Card>
            <p className="text-center text-xl font-medium">{t("allDone")}</p>
          </Card>
        )}

        {later.map((stop) => (
          <StopCard key={stop.id} t={t} lang={lang} stop={stop} />
        ))}

        {data.done.length > 0 && (
          <Card>
            <h2 className="mb-2 text-lg font-bold">
              {t("doneToday")} · {data.done.length}
            </h2>
            <ul className="flex flex-col gap-1 text-base text-soft">
              {data.done.map((o) => (
                <li key={o.id} className="flex justify-between gap-3">
                  <span>{o.customerName}</span>
                  <span>
                    {o.deliveredQty} · {t(`pay_${o.payment}`)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </OpsShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-soft">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function StopCard({
  t,
  lang,
  stop,
  current,
  onOnTheWay,
  onDelivered,
  onFailed,
}: {
  t: T;
  lang: Lang;
  stop: OrderView;
  current?: boolean;
  onOnTheWay?: () => Promise<void>;
  onDelivered?: (
    deliveredQty: number,
    collectedEmpties: number,
    payment: PayChoice,
  ) => Promise<void>;
  onFailed?: (reason: FailReason) => Promise<void>;
}) {
  const [mode, setMode] = useState<"idle" | "deliver" | "fail">("idle");
  const [busy, setBusy] = useState(false);
  const [deliveredQty, setDeliveredQty] = useState(stop.kind === "pickup" ? 0 : stop.qty);
  const [collected, setCollected] = useState(stop.kind === "install" ? 0 : stop.qty);
  const [payment, setPayment] = useState<PayChoice>("cash");
  const address = `${stop.street} ${stop.houseNo}`.trim();
  const wrap = (fn?: () => Promise<void>) => async () => {
    if (!fn) return;
    setBusy(true);
    await fn();
    setBusy(false);
    setMode("idle");
  };

  return (
    <Card className={cn("flex flex-col gap-4", !current && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold">{address}</p>
          <p className="text-lg text-soft">
            {stop.customerName}
            {stop.zone && ` · ${stop.zone}`}
          </p>
          {(stop.floor || stop.entryCode || stop.addressNote) && (
            <p className="mt-1 text-base">
              {stop.floor && `${t("floor")} ${stop.floor} `}
              {stop.entryCode && `· ${t("entryCode")} ${stop.entryCode} `}
              {stop.addressNote && `· ${stop.addressNote}`}
            </p>
          )}
        </div>
        <p className="shrink-0 rounded-2xl bg-paper px-3 py-2 text-center text-xl font-bold shadow-[0_0_0_1px_var(--color-line)]">
          {stop.qty}×{stop.typeCode}
        </p>
      </div>
      <p className="text-base text-soft">
        {t(`w_${stop.timeWindow}`)}
        {stop.status === "on_the_way" && ` · ${t("st_on_the_way")}`}
        {stop.failCount > 0 && ` · ${t("st_failed")}`}
        {stop.customerBalance > 0 && ` · ${t("balance")} ${shekel(stop.customerBalance, lang)}`}
      </p>

      {current && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(`${address} שפרעם`)}&navigate=yes`}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-paper text-lg font-medium shadow-[0_0_0_1px_var(--color-line)]"
            >
              <Navigation className="size-5" /> {t("navigate")}
            </a>
            <a
              href={`tel:${stop.customerPhone}`}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-paper text-lg font-medium shadow-[0_0_0_1px_var(--color-line)]"
            >
              <Phone className="size-5" /> {t("call")}
            </a>
          </div>

          {mode === "idle" && (
            <div className="flex flex-col gap-3">
              {stop.status !== "on_the_way" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={wrap(onOnTheWay)}
                  className="min-h-16 rounded-2xl bg-ink text-2xl font-bold text-paper disabled:opacity-60"
                >
                  {t("onTheWay")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode("deliver")}
                  className="min-h-16 rounded-2xl bg-flame text-2xl font-bold text-white disabled:opacity-60"
                >
                  {t("delivered")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode("fail")}
                className="min-h-12 text-lg font-medium text-soft underline underline-offset-4"
              >
                {t("notDelivered")}
              </button>
            </div>
          )}

          {mode === "deliver" && (
            <div className="flex flex-col gap-4 border-t border-line pt-4">
              {stop.kind !== "pickup" && (
                <Stepper
                  label={t("deliveredQty")}
                  value={deliveredQty}
                  min={0}
                  max={10}
                  onChange={setDeliveredQty}
                />
              )}
              {stop.kind !== "install" && (
                <Stepper
                  label={t("collectedEmpties")}
                  value={collected}
                  min={0}
                  max={10}
                  onChange={setCollected}
                />
              )}
              <div className="flex flex-col gap-2">
                <span className="text-lg font-medium">
                  {t("payment")} · {shekel(deliveredQty * stop.unitPrice, lang)}
                </span>
                <Choice
                  value={payment}
                  onChange={setPayment}
                  options={(["cash", "debt", "transfer_claimed"] as const).map((p) => ({
                    value: p,
                    label: t(`pay_${p}`),
                  }))}
                />
              </div>
              <button
                type="button"
                disabled={busy || (deliveredQty === 0 && collected === 0)}
                onClick={wrap(() => onDelivered!(deliveredQty, collected, payment))}
                className="min-h-16 rounded-2xl bg-flame text-2xl font-bold text-white disabled:opacity-60"
              >
                {t("confirm")}
              </button>
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="min-h-12 text-lg text-soft"
              >
                {t("back")}
              </button>
            </div>
          )}

          {mode === "fail" && (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              {(["no_one_home", "wrong_address", "refused"] as const).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  disabled={busy}
                  onClick={wrap(() => onFailed!(reason))}
                  className="min-h-14 rounded-2xl bg-paper text-lg font-medium shadow-[0_0_0_1px_var(--color-line)]"
                >
                  {t(`reason_${reason}`)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="min-h-12 text-lg text-soft"
              >
                {t("back")}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
