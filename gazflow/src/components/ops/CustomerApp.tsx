import { useMemo, useRef, useState } from "react";
import { Check, Cylinder, MapPin, Phone, Truck } from "lucide-react";
import {
  customerCancelOrder,
  customerPlaceOrder,
  customerSetLang,
  customerTapCall,
  getCustomerHome,
} from "@/lib/ops/api";
import { makeT, shekel, type T } from "@/lib/ops/i18n";
import type { TimeWindow } from "@/lib/ops/logic";
import type { CustomerHome, Lang, OrderView } from "@/lib/ops/types";
import { cn } from "@/lib/utils";
import { errorText, usePoll } from "./hooks";
import { Card, Choice, LangToggle, OpsShell, Stepper } from "./kit";

const STEPS = ["new", "assigned", "on_the_way", "delivered"] as const;

/** The customer's whole app: three big buttons, the live order, and what they have at home. */
export function CustomerApp({ token }: { token: string }) {
  const { data, error, refresh } = usePoll(() => getCustomerHome({ data: { token } }), 15_000);
  const [lang, setLang] = useState<Lang | null>(null);
  const effectiveLang: Lang = lang ?? data?.lang ?? "ar";
  const t = useMemo(() => makeT(effectiveLang), [effectiveLang]);
  const [ordering, setOrdering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const changeLang = (l: Lang) => {
    setLang(l);
    void customerSetLang({ data: { token, lang: l } });
  };

  if (!data) {
    return (
      <OpsShell lang={effectiveLang}>
        <p className="p-8 text-center text-xl text-soft">{errorText(t, error) ?? "…"}</p>
      </OpsShell>
    );
  }

  const open = data.openOrder;
  const due = data.cylinders.some((c) => c.refillDue);

  const call = async () => {
    // Log the tap first so the office sees who is calling, then dial.
    let phone = data.businessPhone;
    try {
      phone = (await customerTapCall({ data: { token } })).phone || phone;
    } catch {
      // Dialling matters more than the log.
    }
    window.location.href = `tel:${phone}`;
  };

  const showStatus = () =>
    statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <OpsShell lang={effectiveLang}>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-4 pt-5 pb-10">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-soft">{data.businessName}</p>
            <h1 className="text-2xl font-bold">{data.name}</h1>
          </div>
          <LangToggle lang={effectiveLang} onChange={changeLang} />
        </header>

        {due && !open && (
          <p className="rounded-2xl bg-[#fff1e3] px-4 py-3 text-lg font-medium text-[#8a3a07]">
            {t("refillDue")}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-2xl bg-[#e7f4ee] px-4 py-3 text-lg font-medium text-[#1d5e45]"
          >
            {notice}
          </p>
        )}

        {ordering ? (
          <OrderSheet
            t={t}
            lang={effectiveLang}
            home={data}
            busy={busy}
            onCancel={() => setOrdering(false)}
            onConfirm={async (typeCode, qty, timeWindow) => {
              setBusy(true);
              try {
                const res = await customerPlaceOrder({
                  data: { token, typeCode, qty, timeWindow },
                });
                setNotice(res.alreadyOpen ? t("alreadyOpen") : t("orderSent"));
                setOrdering(false);
                await refresh();
                showStatus();
              } catch (err) {
                setNotice(errorText(t, err instanceof Error ? err.message : "ops:server"));
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : (
          <nav className="flex flex-col gap-4">
            <BigButton
              icon={<Cylinder className="size-9" />}
              tone="primary"
              disabled={Boolean(open)}
              onClick={() => setOrdering(true)}
              label={data.history.length ? t("orderAgain") : t("orderFirst")}
              sub={
                open
                  ? t("alreadyOpen")
                  : `${data.defaultOrder.qty} × ${typeName(data, data.defaultOrder.typeCode, effectiveLang)}`
              }
            />
            <BigButton
              icon={<Phone className="size-9" />}
              tone="plain"
              onClick={() => void call()}
              label={t("call")}
            />
            <BigButton
              icon={<Truck className="size-9" />}
              tone="plain"
              onClick={showStatus}
              label={t("whereIsMyOrder")}
            />
          </nav>
        )}

        <div ref={statusRef}>
          <Card>
            {open ? (
              <OrderStatus
                t={t}
                lang={effectiveLang}
                today={data.today}
                order={open}
                busy={busy}
                onCancel={async () => {
                  setBusy(true);
                  try {
                    await customerCancelOrder({ data: { token, orderId: open.id } });
                    await refresh();
                  } catch (err) {
                    setNotice(errorText(t, err instanceof Error ? err.message : "ops:server"));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : (
              <p className="text-center text-lg text-soft">{t("noOpenOrder")}</p>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 text-lg font-bold">{t("atHome")}</h2>
          <ul className="flex flex-col gap-2 text-lg">
            {data.cylinders
              .filter((c) => c.held > 0 || c.emptiesOwed > 0)
              .map((c) => (
                <li key={c.typeCode} className="flex items-center justify-between gap-3">
                  <span>{typeName(data, c.typeCode, effectiveLang)}</span>
                  <span className="font-bold tabular-nums">
                    {c.held} {t("cylinders")}
                    {c.emptiesOwed > 0 && (
                      <span className="ms-2 text-base font-medium text-[#8a3a07]">
                        · {c.emptiesOwed} {t("emptiesOwed")}
                      </span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
          {data.balance > 0 && (
            <p className="mt-4 flex items-center justify-between border-t border-line pt-4 text-lg">
              <span>{t("balance")}</span>
              <span className="font-bold">{shekel(data.balance, effectiveLang)}</span>
            </p>
          )}
        </Card>

        {data.history.length > 0 && (
          <Card>
            <h2 className="mb-3 text-lg font-bold">{t("history")}</h2>
            <ul className="flex flex-col gap-2 text-base text-soft">
              {data.history.map((o) => (
                <li key={o.id} className="flex justify-between gap-3">
                  <span className="tabular-nums">{formatDate(o.serviceDate)}</span>
                  <span>
                    {o.deliveredQty ?? o.qty} × {effectiveLang === "ar" ? o.typeAr : o.typeHe}
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

function typeName(home: CustomerHome, code: string, lang: Lang) {
  const type = home.types.find((x) => x.code === code);
  return type ? (lang === "ar" ? type.nameAr : type.nameHe) : code;
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}

function BigButton({
  icon,
  label,
  sub,
  tone,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  tone: "primary" | "plain";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-24 items-center gap-4 rounded-3xl px-6 py-4 text-start transition-transform active:scale-[0.98]",
        tone === "primary"
          ? "bg-flame text-white shadow-[0_8px_24px_-12px_rgba(196,92,18,0.8)]"
          : "bg-card text-ink shadow-[0_0_0_1px_var(--color-line)]",
        disabled && "opacity-50",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex flex-col">
        <span className="text-2xl font-bold leading-tight">{label}</span>
        {sub && (
          <span className={cn("text-base", tone === "primary" ? "text-white/85" : "text-soft")}>
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}

function OrderSheet({
  t,
  lang,
  home,
  busy,
  onCancel,
  onConfirm,
}: {
  t: T;
  lang: Lang;
  home: CustomerHome;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (typeCode: string, qty: number, timeWindow: TimeWindow) => void;
}) {
  const [typeCode, setTypeCode] = useState(home.defaultOrder.typeCode);
  const [qty, setQty] = useState(home.defaultOrder.qty);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("any");
  const [changing, setChanging] = useState(false);

  return (
    <Card className="flex flex-col gap-5">
      <p className="text-center text-3xl font-bold">
        {qty} × {typeName(home, typeCode, lang)}
      </p>
      {changing && (
        <div className="flex flex-col gap-4">
          {home.types.length > 1 && (
            <Choice
              value={typeCode}
              onChange={setTypeCode}
              options={home.types.map((x) => ({
                value: x.code,
                label: lang === "ar" ? x.nameAr : x.nameHe,
              }))}
            />
          )}
          <Stepper label={t("quantity")} value={qty} min={1} max={6} onChange={setQty} />
          <div className="flex flex-col gap-2">
            <span className="text-lg font-medium">{t("whenToCome")}</span>
            <Choice
              value={timeWindow}
              onChange={setTimeWindow}
              options={(["any", "morning", "noon", "afternoon"] as const).map((w) => ({
                value: w,
                label: t(`w_${w}`),
              }))}
            />
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => onConfirm(typeCode, qty, timeWindow)}
        className="min-h-20 rounded-3xl bg-flame text-3xl font-bold text-white disabled:opacity-60"
      >
        {t("confirm")}
      </button>
      <div className="grid grid-cols-2 gap-3">
        {!changing && (
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="min-h-14 rounded-2xl bg-paper text-lg font-medium shadow-[0_0_0_1px_var(--color-line)]"
          >
            {t("change")}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "min-h-14 rounded-2xl bg-paper text-lg font-medium shadow-[0_0_0_1px_var(--color-line)]",
            changing && "col-span-2",
          )}
        >
          {t("back")}
        </button>
      </div>
    </Card>
  );
}

function OrderStatus({
  t,
  lang,
  today,
  order,
  busy,
  onCancel,
}: {
  t: T;
  lang: Lang;
  today: string;
  order: OrderView;
  busy: boolean;
  onCancel: () => void;
}) {
  const reached =
    order.status === "failed" ? 1 : STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const icons = [Check, Cylinder, Truck, MapPin];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-center text-2xl font-bold">
        {order.qty} × {lang === "ar" ? order.typeAr : order.typeHe}
      </p>
      <ol className="flex items-start justify-between gap-1" aria-label={t("whereIsMyOrder")}>
        {STEPS.map((step, i) => {
          const Icon = icons[i];
          const done = i <= reached;
          return (
            <li key={step} className="flex flex-1 flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-full",
                  done
                    ? "bg-flame text-white"
                    : "bg-paper text-soft shadow-[0_0_0_1px_var(--color-line)]",
                  i === reached && "ring-4 ring-flame/25",
                )}
              >
                <Icon className="size-7" />
              </span>
              <span className={cn("text-sm leading-tight", done ? "font-bold" : "text-soft")}>
                {step === "assigned" && order.serviceDate > today
                  ? t("st_tomorrow")
                  : t(`st_${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
      {order.status === "failed" && (
        <p className="text-center text-lg text-[#8a3a07]">{t("st_failed")}</p>
      )}
      {order.driverName && order.status !== "new" && (
        <p className="text-center text-lg text-soft">
          {t("driverIs")}: <span className="font-bold text-ink">{order.driverName}</span>
          {order.timeWindow !== "any" && ` · ${t(`w_${order.timeWindow}`)}`}
        </p>
      )}
      {(order.status === "new" || order.status === "assigned") && (
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="min-h-12 self-center rounded-2xl px-5 text-base font-medium text-soft underline underline-offset-4"
        >
          {t("cancelOrder")}
        </button>
      )}
    </div>
  );
}
