/**
 * GazFlow business rules as pure functions — no database, no clock, no I/O — so they
 * are tested directly (logic.test.ts) and the server only wires them to SQL.
 * Rules follow artifacts/logika-maarechet-gazflow (GF-LOGIC-01), cut to what a
 * ~100-customer distributor needs: no warehouse stock in this version.
 */

export const TIME_ZONE = "Asia/Jerusalem";

export type OrderStatus = "new" | "assigned" | "on_the_way" | "delivered" | "failed" | "cancelled";
export type OrderKind = "exchange" | "install" | "pickup";
export type TimeWindow = "morning" | "noon" | "afternoon" | "any";
export type Payment = "pending" | "cash" | "transfer_claimed" | "transfer_confirmed" | "debt";
export type HoldReason = "no_zone" | "no_driver" | "over_capacity" | "debt";

/** Statuses that still need work today. */
export const OPEN_STATUSES: OrderStatus[] = ["new", "assigned", "on_the_way", "failed"];

/** Calendar date and hour in Israel for an instant, as 'YYYY-MM-DD' and 0–23. */
export function israelClock(at: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** 'YYYY-MM-DD' plus `days` (calendar arithmetic in UTC, so no DST drift). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` ('YYYY-MM-DD'). */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Orders placed before the cutoff hour are served today; later ones tomorrow. */
export function serviceDateFor(at: Date, cutoffHour: number): string {
  const { date, hour } = israelClock(at);
  return hour < cutoffHour ? date : addDays(date, 1);
}

export type DriverLoad = {
  id: string;
  zones: string[];
  capacity: number;
  active: boolean;
  /** Cylinders already on this driver's route for the day. */
  load: number;
};

/**
 * Pick the driver for an order: active, serving the zone (no zones = all zones),
 * with room for `qty` more cylinders; the least loaded wins, ties by id for a
 * stable result. Returns a hold reason when nobody fits — the office decides.
 */
export function pickDriver(
  zone: string,
  qty: number,
  drivers: DriverLoad[],
): { driverId: string } | { hold: HoldReason } {
  if (!zone.trim()) return { hold: "no_zone" };
  const serving = drivers.filter(
    (d) => d.active && (d.zones.length === 0 || d.zones.includes(zone)),
  );
  if (serving.length === 0) return { hold: "no_driver" };
  const fitting = serving.filter((d) => d.load + qty <= d.capacity);
  if (fitting.length === 0) return { hold: "over_capacity" };
  fitting.sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));
  return { driverId: fitting[0].id };
}

/** Decide where a new order goes: straight to a driver, or held for the office. */
export function triage(input: {
  zone: string;
  qty: number;
  balance: number;
  debtThreshold: number;
  drivers: DriverLoad[];
}): { driverId: string } | { hold: HoldReason } {
  // Household gas is a sensitive service: high debt never blocks the order, it asks a human.
  if (input.balance > input.debtThreshold) return { hold: "debt" };
  return pickDriver(input.zone, input.qty, input.drivers);
}

const WINDOW_RANK: Record<TimeWindow, number> = { morning: 0, noon: 1, any: 2, afternoon: 3 };

export type Stop = {
  id: string;
  time_window: TimeWindow;
  zone: string;
  street: string;
  house_no: string;
  fail_count: number;
};

/**
 * Route order a driver who knows the neighbourhood can predict: time window first,
 * then zone, street, house number. A stop skipped today goes to the end.
 */
export function orderStops<T extends Stop>(stops: T[]): T[] {
  const houseNo = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
  };
  return [...stops].sort(
    (a, b) =>
      Math.min(a.fail_count, 1) - Math.min(b.fail_count, 1) ||
      WINDOW_RANK[a.time_window] - WINDOW_RANK[b.time_window] ||
      a.zone.localeCompare(b.zone, "he") ||
      a.street.localeCompare(b.street, "he") ||
      houseNo(a.house_no) - houseNo(b.house_no) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Refill cycle in days: a manual lock wins; otherwise the mean gap between the last
 * three completed deliveries, ignoring gaps over 60 or under 5 days; otherwise the
 * cylinder type's default.
 */
export function cycleDays(
  deliveryDates: string[],
  typeDefault: number,
  manual: number | null,
): number {
  if (manual && manual > 0) return manual;
  const recent = [...new Set(deliveryDates)].sort().slice(-4);
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const gap = daysBetween(recent[i - 1], recent[i]);
    if (gap >= 5 && gap <= 60) gaps.push(gap);
  }
  if (recent.length < 3 || gaps.length === 0) return typeDefault;
  return Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
}

/** Refill is due two days before the cycle runs out. */
export function refillDueDate(lastDelivery: string, cycle: number): string {
  return addDays(lastDelivery, cycle - 2);
}

export function isRefillDue(
  lastDelivery: string | null,
  cycle: number,
  today: string,
  hasOpenOrder: boolean,
): boolean {
  if (!lastDelivery || hasOpenOrder) return false;
  return today >= refillDueDate(lastDelivery, cycle);
}

export type CustomerStock = { held: number; empties_owed: number };

/**
 * What the customer has at home after a delivery.
 * exchange: full for empty — cylinders held stay the same; an empty not handed back is owed.
 * install: new cylinders at the house. pickup: cylinders taken back.
 */
export function applyDelivery(
  stock: CustomerStock,
  kind: OrderKind,
  delivered: number,
  collected: number,
): CustomerStock {
  if (kind === "install") return { held: stock.held + delivered, empties_owed: stock.empties_owed };
  if (kind === "pickup") {
    return {
      held: Math.max(0, stock.held - collected),
      empties_owed: Math.max(0, stock.empties_owed - collected),
    };
  }
  const missing = Math.max(0, delivered - collected);
  const extra = Math.max(0, collected - delivered);
  return {
    held: stock.held,
    empties_owed: Math.max(0, stock.empties_owed + missing - extra),
  };
}

/**
 * A failed stop: the first failure sends it to the end of today's route; the second
 * moves it to tomorrow and flags the office. Nothing is cancelled automatically.
 */
export function afterFailure(
  failCount: number,
  serviceDate: string,
): { failCount: number; serviceDate: string; flagOffice: boolean } {
  const next = failCount + 1;
  return next >= 2
    ? { failCount: next, serviceDate: addDays(serviceDate, 1), flagOffice: true }
    : { failCount: next, serviceDate, flagOffice: false };
}

/**
 * The money side of a delivered order. A transfer the customer says they made stays
 * owed until the office sees it in the account (`confirmTransfer`).
 */
export function settle(
  payment: Payment,
  amount: number,
  balance: number,
): { balance: number; cashToCollect: number } {
  if (payment === "cash") return { balance, cashToCollect: amount };
  if (payment === "debt" || payment === "transfer_claimed") {
    return { balance: balance + amount, cashToCollect: 0 };
  }
  return { balance, cashToCollect: 0 };
}

/** The office saw a claimed transfer arrive: it stops being owed. */
export function confirmTransfer(amount: number, balance: number): number {
  return balance - amount;
}
