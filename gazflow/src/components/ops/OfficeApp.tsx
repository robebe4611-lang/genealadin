import { useMemo, useState, type ReactNode } from "react";
import { Copy, PhoneIncoming, Send } from "lucide-react";
import {
  getOfficeBoard,
  officeAssign,
  officeCancel,
  officeConfirmTransfer,
  officeGetSettings,
  officeHandleCall,
  officeListCustomers,
  officeOrderLikeLast,
  officeRecordPayment,
  officeSaveCustomer,
  officeSaveDriver,
  officeSaveSettings,
} from "@/lib/ops/api";
import { makeT, shekel, type T } from "@/lib/ops/i18n";
import type { Lang, OfficeBoard, OfficeCustomer, OfficeDriver, OrderView } from "@/lib/ops/types";
import { cn } from "@/lib/utils";
import { errorText, usePoll, useStoredLang } from "./hooks";
import { Card, LangToggle, OpsShell } from "./kit";

type Tab = "today" | "customers" | "drivers" | "settings";

/** Office: the owner watches the day run itself and steps in only where asked. */
export function OfficeApp({ token }: { token: string }) {
  const [stored, setLang] = useStoredLang("gazflow-office-lang");
  const lang: Lang = stored ?? "he";
  const t = useMemo(() => makeT(lang), [lang]);
  const [tab, setTab] = useState<Tab>("today");
  const board = usePoll(() => getOfficeBoard({ data: { token } }), 10_000);

  return (
    <OpsShell lang={lang}>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-5 pb-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-soft">{t("office")}</p>
            <h1 className="text-2xl font-bold">{board.data?.businessName ?? "…"}</h1>
          </div>
          <LangToggle lang={lang} onChange={setLang} />
        </header>
        <nav className="grid grid-cols-4 gap-2" aria-label={t("office")}>
          {(["today", "customers", "drivers", "settings"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => {
                setTab(k);
                // Work done in another tab (a new customer, an order) shows up immediately.
                if (k === "today") void board.refresh();
              }}
              className={cn(
                "min-h-12 rounded-2xl text-base font-medium shadow-[0_0_0_1px_var(--color-line)]",
                tab === k ? "bg-ink text-paper" : "bg-card",
              )}
            >
              {t(k)}
            </button>
          ))}
        </nav>

        {!board.data ? (
          <p className="p-8 text-center text-xl text-soft">{errorText(t, board.error) ?? "…"}</p>
        ) : tab === "today" ? (
          <TodayTab t={t} lang={lang} token={token} board={board.data} refresh={board.refresh} />
        ) : tab === "customers" ? (
          <CustomersTab t={t} lang={lang} token={token} businessName={board.data.businessName} />
        ) : tab === "drivers" ? (
          <DriversTab t={t} token={token} drivers={board.data.drivers} refresh={board.refresh} />
        ) : (
          <SettingsTab t={t} token={token} />
        )}
      </main>
    </OpsShell>
  );
}

// ---------- shared ----------

function useAction(t: T, after?: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      setMessage(ok ?? null);
      await after?.();
    } catch (err) {
      setMessage(errorText(t, err instanceof Error ? err.message : "ops:server"));
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, run };
}

function SmallButton({
  children,
  onClick,
  tone = "plain",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "plain" | "primary" | "quiet";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium disabled:opacity-50",
        tone === "primary" && "bg-flame text-white",
        tone === "plain" && "bg-paper shadow-[0_0_0_1px_var(--color-line)]",
        tone === "quiet" && "text-soft underline underline-offset-4",
      )}
    >
      {children}
    </button>
  );
}

function linkFor(path: string) {
  return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
}

/** wa.me wants the international number: 05X… → 9725X… */
function whatsappUrl(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "972");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function CopyButton({ t, text }: { t: T; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <SmallButton
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      <Copy className="size-4" /> {done ? t("copied") : t("copyLink")}
    </SmallButton>
  );
}

function StatusChip({ t, status }: { t: T; status: OrderView["status"] }) {
  const tone: Record<OrderView["status"], string> = {
    new: "bg-[#fff1e3] text-[#8a3a07]",
    assigned: "bg-paper text-ink",
    on_the_way: "bg-[#e6eef8] text-[#1f3f6b]",
    delivered: "bg-[#e7f4ee] text-[#1d5e45]",
    failed: "bg-[#fde8e4] text-[#8c2b1a]",
    cancelled: "bg-paper text-soft",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tone[status])}>
      {t(`st_${status}`)}
    </span>
  );
}

function minutesAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

// ---------- today ----------

function TodayTab({
  t,
  lang,
  token,
  board,
  refresh,
}: {
  t: T;
  lang: Lang;
  token: string;
  board: OfficeBoard;
  refresh: () => Promise<void>;
}) {
  const action = useAction(t, refresh);
  const activeDrivers = board.drivers.filter((d) => d.active);
  const needsYou = board.callTaps.length + board.held.length + board.transfersToConfirm.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("deliveredCount")} value={String(board.summary.delivered)} />
        <Stat label={t("remainingCount")} value={String(board.summary.remaining)} />
        <Stat label={t("cashToday")} value={shekel(board.summary.cash, lang)} />
        <Stat label={t("newDebtToday")} value={shekel(board.summary.newDebt, lang)} />
      </div>

      {action.message && (
        <p className="rounded-2xl bg-card px-4 py-3 text-base">{action.message}</p>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-bold">
          {t("needsYou")} {needsYou > 0 && <span className="text-flame">· {needsYou}</span>}
        </h2>
        {needsYou === 0 && <p className="text-base text-soft">{t("allQuiet")}</p>}
        <ul className="flex flex-col divide-y divide-line">
          {board.callTaps.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2 text-base">
                <PhoneIncoming className="size-5 text-flame" />
                <b>{c.name}</b> {t("callingNow")} · {t("minutesAgo", { n: minutesAgo(c.at) })}
              </span>
              <span className="flex gap-2">
                <SmallButton
                  tone="primary"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(() =>
                      officeOrderLikeLast({ data: { token, customerId: c.customerId } }),
                    )
                  }
                >
                  {t("orderForThem")}
                </SmallButton>
                <SmallButton
                  disabled={action.busy}
                  onClick={() =>
                    action.run(() => officeHandleCall({ data: { token, tapId: c.id } }))
                  }
                >
                  {t("handled")}
                </SmallButton>
              </span>
            </li>
          ))}
          {board.held.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 py-3">
              <span className="text-base">
                <b>{o.customerName}</b> · {o.street} {o.houseNo} · {o.qty}×{o.typeCode} ·{" "}
                <span className="text-[#8a3a07]">
                  {o.holdReason ? t(`hold_${o.holdReason}` as never) : ""}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <SmallButton
                  tone="primary"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(() =>
                      officeAssign({ data: { token, orderId: o.id, driverId: null } }),
                    )
                  }
                >
                  {t("autoAssign")}
                </SmallButton>
                {activeDrivers.map((d) => (
                  <SmallButton
                    key={d.id}
                    disabled={action.busy}
                    onClick={() =>
                      action.run(() =>
                        officeAssign({ data: { token, orderId: o.id, driverId: d.id } }),
                      )
                    }
                  >
                    {t("assignTo")}
                    {d.name}
                  </SmallButton>
                ))}
                <SmallButton
                  tone="quiet"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(() =>
                      officeCancel({ data: { token, orderId: o.id, reason: "office" } }),
                    )
                  }
                >
                  {t("cancel")}
                </SmallButton>
              </span>
            </li>
          ))}
          {board.transfersToConfirm.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-base">
                {t("transfers")}: <b>{o.customerName}</b> · {shekel(o.amount, lang)}
              </span>
              <SmallButton
                tone="primary"
                disabled={action.busy}
                onClick={() =>
                  action.run(() => officeConfirmTransfer({ data: { token, orderId: o.id } }))
                }
              >
                {t("confirmTransfer")}
              </SmallButton>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {activeDrivers.map((d) => (
          <Card key={d.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{d.name}</h3>
              <span className="text-sm text-soft tabular-nums">
                {d.load}/{d.capacity}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper" aria-hidden>
              <div
                className="h-full bg-flame"
                style={{
                  width: `${d.done + d.remaining ? (100 * d.done) / (d.done + d.remaining) : 0}%`,
                }}
              />
            </div>
            <p className="text-base text-soft">
              {t("deliveredCount")} {d.done} · {t("remainingCount")} {d.remaining} ·{" "}
              {t("cashToday")} {shekel(d.cash, lang)}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">{t("allOrders")}</h2>
        {board.today.length === 0 ? (
          <p className="text-base text-soft">—</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {board.today.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-base"
              >
                <span>
                  <b>{o.customerName}</b> · {o.street} {o.houseNo}
                </span>
                <span className="flex items-center gap-2 text-soft">
                  {o.qty}×{o.typeCode} · {o.driverName ?? "—"}{" "}
                  <StatusChip t={t} status={o.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {board.refillDue.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-bold">
            {t("refillList")} · {board.refillDue.length}
          </h2>
          <ul className="flex flex-col divide-y divide-line">
            {board.refillDue.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-base"
              >
                <span>
                  <b>{c.name}</b> · {c.street} {c.houseNo}
                </span>
                <span className="flex gap-2">
                  <a
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-paper px-3 text-sm font-medium shadow-[0_0_0_1px_var(--color-line)]"
                    href={whatsappUrl(c.phone, linkFor(`/c/${c.token}`))}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Send className="size-4" /> WhatsApp
                  </a>
                  <SmallButton
                    tone="primary"
                    disabled={action.busy}
                    onClick={() =>
                      action.run(() => officeOrderLikeLast({ data: { token, customerId: c.id } }))
                    }
                  >
                    {t("orderForThem")}
                  </SmallButton>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
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

// ---------- customers ----------

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  lang: "ar" as Lang,
  street: "",
  houseNo: "",
  zone: "",
  floor: "",
  entryCode: "",
  note: "",
  held12: 1,
  held48: 0,
};

function CustomersTab({
  t,
  lang,
  token,
  businessName,
}: {
  t: T;
  lang: Lang;
  token: string;
  businessName: string;
}) {
  const list = usePoll(() => officeListCustomers({ data: { token } }), 30_000);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<(typeof EMPTY_CUSTOMER & { id?: string }) | null>(null);
  const action = useAction(t, list.refresh);

  const shown = (list.data ?? []).filter(
    (c) => !query || c.name.includes(query) || c.phone.includes(query) || c.street.includes(query),
  );

  if (editing) {
    return (
      <CustomerForm
        t={t}
        value={editing}
        busy={action.busy}
        message={action.message}
        onCancel={() => setEditing(null)}
        onSave={(v) =>
          action.run(async () => {
            await officeSaveCustomer({ data: { token, ...v } });
            setEditing(null);
          }, t("saved"))
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          className="min-h-12 flex-1 rounded-2xl bg-card px-4 text-base shadow-[0_0_0_1px_var(--color-line)]"
        />
        <SmallButton tone="primary" onClick={() => setEditing({ ...EMPTY_CUSTOMER })}>
          {t("addCustomer")}
        </SmallButton>
      </div>
      {action.message && (
        <p className="rounded-2xl bg-card px-4 py-3 text-base">{action.message}</p>
      )}
      <ul className="flex flex-col gap-3">
        {shown.map((c) => (
          <CustomerRowView
            key={c.id}
            t={t}
            lang={lang}
            c={c}
            businessName={businessName}
            busy={action.busy}
            onEdit={() =>
              setEditing({
                id: c.id,
                name: c.name,
                phone: c.phone,
                lang: c.lang,
                street: c.street,
                houseNo: c.houseNo,
                zone: c.zone,
                floor: c.floor,
                entryCode: c.entryCode,
                note: c.addressNote,
                held12: c.held12,
                held48: c.held48,
              })
            }
            onOrder={() =>
              action.run(() => officeOrderLikeLast({ data: { token, customerId: c.id } }))
            }
            onPayment={(amount) =>
              action.run(
                () => officeRecordPayment({ data: { token, customerId: c.id, amount } }),
                t("saved"),
              )
            }
          />
        ))}
      </ul>
    </div>
  );
}

function CustomerRowView({
  t,
  lang,
  c,
  businessName,
  busy,
  onEdit,
  onOrder,
  onPayment,
}: {
  t: T;
  lang: Lang;
  c: OfficeCustomer;
  businessName: string;
  busy: boolean;
  onEdit: () => void;
  onOrder: () => void;
  onPayment: (amount: number) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const link = linkFor(`/c/${c.token}`);
  const message = `${makeT(c.lang)("linkMessage", { name: c.name, business: businessName })} ${link}`;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{c.name}</p>
          <p className="text-base text-soft">
            {c.street} {c.houseNo}
            {c.zone && ` · ${c.zone}`} · <span dir="ltr">{c.phone}</span>
          </p>
        </div>
        <p className="text-base">
          {c.held} {t("cylinders")}
          {c.emptiesOwed > 0 && (
            <span className="text-[#8a3a07]">
              {" "}
              · {c.emptiesOwed} {t("emptiesOwed")}
            </span>
          )}
          {c.balance > 0 && <span className="font-bold"> · {shekel(c.balance, lang)}</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <SmallButton tone="primary" disabled={busy || c.hasOpenOrder} onClick={onOrder}>
          {t("orderForThem")}
        </SmallButton>
        <a
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-paper px-3 text-sm font-medium shadow-[0_0_0_1px_var(--color-line)]"
          href={whatsappUrl(c.phone, message)}
          target="_blank"
          rel="noreferrer"
        >
          <Send className="size-4" /> {t("sendLink")}
        </a>
        <CopyButton t={t} text={link} />
        <SmallButton onClick={onEdit}>{t("edit")}</SmallButton>
        {c.balance > 0 && (
          <SmallButton onClick={() => setPaying((p) => !p)}>{t("recordPayment")}</SmallButton>
        )}
      </div>
      {paying && (
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("amount")}
            className="min-h-11 w-32 rounded-xl bg-paper px-3 shadow-[0_0_0_1px_var(--color-line)]"
          />
          <SmallButton
            tone="primary"
            disabled={busy || !(Number(amount) > 0)}
            onClick={() => {
              onPayment(Number(amount));
              setPaying(false);
              setAmount("");
            }}
          >
            {t("save")}
          </SmallButton>
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-soft">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "min-h-12 rounded-xl bg-paper px-3 text-base shadow-[0_0_0_1px_var(--color-line)]";

function CustomerForm({
  t,
  value,
  busy,
  message,
  onCancel,
  onSave,
}: {
  t: T;
  value: typeof EMPTY_CUSTOMER & { id?: string };
  busy: boolean;
  message: string | null;
  onCancel: () => void;
  onSave: (v: typeof EMPTY_CUSTOMER & { id?: string }) => void;
}) {
  const [v, setV] = useState(value);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const text = (
    k: "name" | "phone" | "street" | "houseNo" | "zone" | "floor" | "entryCode" | "note",
    label: string,
  ) => (
    <Field label={label}>
      <input className={inputClass} value={v[k]} onChange={(e) => set(k, e.target.value)} />
    </Field>
  );
  return (
    <Card className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        {text("name", t("name"))}
        {text("phone", t("phone"))}
        {text("street", t("street"))}
        {text("houseNo", t("houseNo"))}
        {text("zone", t("zone"))}
        {text("floor", t("floor"))}
        {text("entryCode", t("entryCode"))}
        {text("note", t("note"))}
        <Field label={t("language")}>
          <select
            className={inputClass}
            value={v.lang}
            onChange={(e) => set("lang", e.target.value as Lang)}
          >
            <option value="ar">عربي</option>
            <option value="he">עברית</option>
          </select>
        </Field>
        <Field label={t("held12")}>
          <input
            type="number"
            min={0}
            max={10}
            className={inputClass}
            value={v.held12}
            onChange={(e) => set("held12", Number(e.target.value))}
          />
        </Field>
        <Field label={t("held48")}>
          <input
            type="number"
            min={0}
            max={10}
            className={inputClass}
            value={v.held48}
            onChange={(e) => set("held48", Number(e.target.value))}
          />
        </Field>
      </div>
      {message && <p className="text-base text-[#8c2b1a]">{message}</p>}
      <div className="flex gap-2">
        <SmallButton
          tone="primary"
          disabled={busy || !v.name || !v.phone || !v.street}
          onClick={() => onSave(v)}
        >
          {t("save")}
        </SmallButton>
        <SmallButton onClick={onCancel}>{t("back")}</SmallButton>
      </div>
    </Card>
  );
}

// ---------- drivers ----------

function DriversTab({
  t,
  token,
  drivers,
  refresh,
}: {
  t: T;
  token: string;
  drivers: OfficeDriver[];
  refresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<{
    id?: string;
    name: string;
    phone: string;
    lang: Lang;
    zones: string;
    capacity: number;
    active: boolean;
  } | null>(null);
  const action = useAction(t, refresh);

  if (editing) {
    const set = <K extends keyof typeof editing>(k: K, val: (typeof editing)[K]) =>
      setEditing((p) => (p ? { ...p, [k]: val } : p));
    return (
      <Card className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("name")}>
            <input
              className={inputClass}
              value={editing.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label={t("phone")}>
            <input
              className={inputClass}
              value={editing.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label={t("zones")}>
            <input
              className={inputClass}
              value={editing.zones}
              onChange={(e) => set("zones", e.target.value)}
            />
          </Field>
          <Field label={t("capacity")}>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={editing.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))}
            />
          </Field>
          <Field label={t("language")}>
            <select
              className={inputClass}
              value={editing.lang}
              onChange={(e) => set("lang", e.target.value as Lang)}
            >
              <option value="ar">عربي</option>
              <option value="he">עברית</option>
            </select>
          </Field>
          <label className="flex min-h-12 items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            {t("active")}
          </label>
        </div>
        {action.message && <p className="text-base text-[#8c2b1a]">{action.message}</p>}
        <div className="flex gap-2">
          <SmallButton
            tone="primary"
            disabled={action.busy || !editing.name}
            onClick={() =>
              action.run(async () => {
                await officeSaveDriver({
                  data: {
                    token,
                    ...editing,
                    zones: editing.zones
                      .split(/[,،]/)
                      .map((z) => z.trim())
                      .filter(Boolean),
                  },
                });
                setEditing(null);
              }, t("saved"))
            }
          >
            {t("save")}
          </SmallButton>
          <SmallButton onClick={() => setEditing(null)}>{t("back")}</SmallButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SmallButton
          tone="primary"
          onClick={() =>
            setEditing({ name: "", phone: "", lang: "ar", zones: "", capacity: 20, active: true })
          }
        >
          {t("addDriver")}
        </SmallButton>
      </div>
      {action.message && (
        <p className="rounded-2xl bg-card px-4 py-3 text-base">{action.message}</p>
      )}
      {drivers.map((d) => (
        <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-lg font-bold">
              {d.name} {!d.active && <span className="text-sm text-soft">({t("active")}: ✗)</span>}
            </p>
            <p className="text-base text-soft">
              {d.zones.length ? d.zones.join(" · ") : "*"} · {t("capacity")} {d.capacity}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {d.phone && (
              <a
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-paper px-3 text-sm font-medium shadow-[0_0_0_1px_var(--color-line)]"
                href={whatsappUrl(d.phone, linkFor(`/d/${d.token}`))}
                target="_blank"
                rel="noreferrer"
              >
                <Send className="size-4" /> {t("sendLink")}
              </a>
            )}
            <CopyButton t={t} text={linkFor(`/d/${d.token}`)} />
            <SmallButton
              onClick={() =>
                setEditing({
                  id: d.id,
                  name: d.name,
                  phone: d.phone,
                  lang: "ar",
                  zones: d.zones.join(", "),
                  capacity: d.capacity,
                  active: d.active,
                })
              }
            >
              {t("edit")}
            </SmallButton>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------- settings ----------

function SettingsTab({ t, token }: { t: T; token: string }) {
  const settings = usePoll(() => officeGetSettings({ data: { token } }), 60_000);
  const action = useAction(t, settings.refresh);
  const [draft, setDraft] = useState<{
    name: string;
    phone: string;
    cutoffHour: number;
    debtThreshold: number;
    prices: Record<string, number>;
  } | null>(null);

  const s = settings.data;
  if (!s) return <p className="p-8 text-center text-soft">…</p>;
  const v = draft ?? {
    name: s.name,
    phone: s.phone,
    cutoffHour: s.cutoffHour,
    debtThreshold: s.debtThreshold,
    prices: Object.fromEntries(s.types.map((x) => [x.code, x.price])),
  };
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setDraft({ ...v, [k]: val });

  return (
    <Card className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label={t("businessName")}>
          <input
            className={inputClass}
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label={t("businessPhone")}>
          <input
            className={inputClass}
            value={v.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label={t("cutoffHour")}>
          <input
            type="number"
            min={0}
            max={23}
            className={inputClass}
            value={v.cutoffHour}
            onChange={(e) => set("cutoffHour", Number(e.target.value))}
          />
        </Field>
        <Field label={t("debtThreshold")}>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={v.debtThreshold}
            onChange={(e) => set("debtThreshold", Number(e.target.value))}
          />
        </Field>
        {s.types.map((x) => (
          <Field key={x.code} label={`${t("price")} · ${x.nameHe}`}>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={v.prices[x.code] ?? 0}
              onChange={(e) => set("prices", { ...v.prices, [x.code]: Number(e.target.value) })}
            />
          </Field>
        ))}
      </div>
      {action.message && <p className="text-base">{action.message}</p>}
      <div>
        <SmallButton
          tone="primary"
          disabled={action.busy}
          onClick={() =>
            action.run(async () => {
              await officeSaveSettings({ data: { token, ...v } });
              setDraft(null);
            }, t("saved"))
          }
        >
          {t("save")}
        </SmallButton>
      </div>
    </Card>
  );
}
