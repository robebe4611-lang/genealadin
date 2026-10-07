/**
 * GazFlow operations service — server only. Every entry point takes the caller's
 * secret token, resolves who they are, and only then touches data scoped to them.
 * Business rules live in ./logic (pure, tested); this file wires them to SQL.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { dbSource, getSql, withTransaction, type Sql } from "@/lib/db";
import {
  afterFailure,
  applyDelivery,
  confirmTransfer,
  cycleDays,
  israelClock,
  isRefillDue,
  OPEN_STATUSES,
  orderStops,
  pickDriver,
  serviceDateFor,
  settle,
  triage,
  type DriverLoad,
  type HoldReason,
  type OrderKind,
  type OrderStatus,
  type Payment,
  type TimeWindow,
} from "./logic";
import type {
  CallTap,
  CustomerHome,
  CustomerRow,
  CylinderType,
  DriverDay,
  DriverRow,
  Lang,
  OfficeBoard,
  OrderView,
} from "./types";

export class OpsError extends Error {
  constructor(
    public code: "not_found" | "forbidden" | "invalid" | "conflict",
    message: string,
  ) {
    super(message);
  }
}

const newId = () => randomUUID();
const newToken = () => randomBytes(18).toString("base64url");
const num = (v: unknown) => Number(v ?? 0);
const today = (now = new Date()) => israelClock(now).date;

// ---------- bootstrap ----------

type Business = {
  id: string;
  name: string;
  phone: string;
  cutoff_hour: number;
  debt_threshold: number;
  owner_token: string;
  last_tick: string | null;
};

const bootRef = globalThis as typeof globalThis & { __opsBoot__?: Promise<void> };

/** Make sure the business row and cylinder types exist; in preview, load a demo. */
function boot(): Promise<void> {
  bootRef.__opsBoot__ ??= (async () => {
    const sql = await getSql();
    const [existing] = await sql`select id from ops_business where id = 'main'`;
    if (existing) return;
    const preview = dbSource === "pglite";
    const ownerToken = process.env.OWNER_TOKEN?.trim() || (preview ? "demo-owner" : newToken());
    await withTransaction(async (tx) => {
      await tx`insert into ops_business (id, name, phone, owner_token)
               values ('main', ${preview ? "גזפלו (דמו)" : "גזפלו"}, ${preview ? "0500000000" : ""}, ${ownerToken})
               on conflict (id) do nothing`;
      // Prices are the owner's to set (office settings). The demo uses 0 so it never
      // shows a made-up price as if it were real.
      await tx`insert into ops_cylinder_types (code, name_he, name_ar, price, default_cycle_days, sort)
               values ('12', 'בלון 12 ק״ג', 'جرة 12 كغ', 0, 28, 1), ('48', 'בלון 48 ק״ג', 'جرة 48 كغ', 0, 21, 2)
               on conflict (code) do nothing`;
      if (preview) await seedDemo(tx);
    });
    console.info(
      `[ops] office link: /o/${ownerToken}${preview ? "  (demo: /c/demo-c1, /d/demo-d1)" : ""}`,
    );
  })().catch((err) => {
    bootRef.__opsBoot__ = undefined;
    throw err;
  });
  return bootRef.__opsBoot__;
}

async function seedDemo(tx: Sql) {
  const drivers = [
    { id: "drv-1", name: "סאמר", token: "demo-d1", zones: ["מרכז", "צפון"] },
    { id: "drv-2", name: "ראמי", token: "demo-d2", zones: ["דרום"] },
  ];
  for (const d of drivers) {
    await tx`insert into ops_drivers (id, name, phone, token, zones, lang)
             values (${d.id}, ${d.name}, '', ${d.token}, ${d.zones}, 'ar')`;
  }
  const people = [
    ["أحمد خطيب", "0501111001", "ar", "شارع الجبل", "12", "מרכז"],
    ["סלים חדאד", "0501111002", "he", "רחוב הזיתים", "4", "צפון"],
    ["مريم عودة", "0501111003", "ar", "شارع المدارس", "27", "דרום"],
    ["יוסף נסאר", "0501111004", "he", "רחוב הכנסייה", "8", "מרכז"],
    ["ليلى حسن", "0501111005", "ar", "شارع البلدية", "3", "צפון"],
    ["ג'ורג' סאבא", "0501111006", "he", "רחוב השוק", "15", "דרום"],
  ] as const;
  const day = today();
  for (const [i, [name, phone, lang, street, house, zone]] of people.entries()) {
    const id = `cus-${i + 1}`;
    const addr = `adr-${i + 1}`;
    await tx`insert into ops_customers (id, name, phone, lang, token)
             values (${id}, ${name}, ${phone}, ${lang}, ${`demo-c${i + 1}`})`;
    await tx`insert into ops_addresses (id, customer_id, street, house_no, zone)
             values (${addr}, ${id}, ${street}, ${house}, ${zone})`;
    // Each demo customer had deliveries ~25 days apart, so some are due for a refill.
    const last = new Date(`${day}T00:00:00Z`);
    last.setUTCDate(last.getUTCDate() - (20 + i * 2));
    const lastDate = last.toISOString().slice(0, 10);
    await tx`insert into ops_customer_cylinders (customer_id, type_code, held, last_delivery)
             values (${id}, '12', 2, ${lastDate})`;
    await tx`insert into ops_orders (id, customer_id, address_id, type_code, qty, status, service_date,
                                     unit_price, delivered_qty, collected_empties, payment, delivered_at)
             values (${`ord-h${i + 1}`}, ${id}, ${addr}, '12', 1, 'delivered', ${lastDate}, 0, 1, 1, 'cash',
                     ${`${lastDate}T09:00:00Z`})`;
  }
}

async function business(sql: Sql): Promise<Business> {
  const [b] = await sql<Business>`select * from ops_business where id = 'main'`;
  return { ...b, debt_threshold: num(b.debt_threshold) };
}

/**
 * Once per Israel day: stops left unfinished on an earlier day move to today, keeping
 * their driver. Runs lazily on the first request of the day — no cron needed.
 */
async function dailyTick(now = new Date()) {
  const sql = await getSql();
  const day = today(now);
  const b = await business(sql);
  if (b.last_tick === day) return;
  await withTransaction(async (tx) => {
    const [claimed] = await tx`update ops_business set last_tick = ${day}
                               where id = 'main' and (last_tick is null or last_tick < ${day})
                               returning id`;
    if (!claimed) return;
    const moved = await tx<{ id: string }>`
      update ops_orders set service_date = ${day}, status = case when status = 'new' then 'new' else 'assigned' end,
             stop_seq = null, updated_at = now()
      where service_date < ${day} and status in ('new', 'assigned', 'on_the_way', 'failed')
      returning id`;
    for (const o of moved)
      await logEvent(tx, { orderId: o.id, actor: "system", kind: "carried_over" });
  });
}

/** Resolve the caller and run the day's housekeeping first. */
async function ready() {
  await boot();
  await dailyTick();
  return getSql();
}

async function logEvent(
  sql: Sql,
  e: { orderId?: string; customerId?: string; actor: string; kind: string; detail?: unknown },
) {
  await sql`insert into ops_events (id, order_id, customer_id, actor, kind, detail)
            values (${newId()}, ${e.orderId ?? null}, ${e.customerId ?? null}, ${e.actor}, ${e.kind},
                    ${JSON.stringify(e.detail ?? {})})`;
}

// ---------- shared reads ----------

const ORDER_VIEW = `
  select o.*, c.name as customer_name, c.phone as customer_phone, c.lang as customer_lang,
         c.balance as customer_balance,
         a.street, a.house_no, a.zone, a.floor, a.entry_code, a.note as address_note,
         d.name as driver_name, t.name_he as type_he, t.name_ar as type_ar
  from ops_orders o
  join ops_customers c on c.id = o.customer_id
  join ops_addresses a on a.id = o.address_id
  join ops_cylinder_types t on t.code = o.type_code
  left join ops_drivers d on d.id = o.driver_id`;

function toOrderView(r: Record<string, unknown>): OrderView {
  return {
    id: String(r.id),
    customerId: String(r.customer_id),
    customerName: String(r.customer_name),
    customerPhone: String(r.customer_phone),
    customerBalance: num(r.customer_balance),
    street: String(r.street),
    houseNo: String(r.house_no),
    zone: String(r.zone),
    floor: String(r.floor),
    entryCode: String(r.entry_code),
    addressNote: String(r.address_note),
    typeCode: String(r.type_code),
    typeHe: String(r.type_he),
    typeAr: String(r.type_ar),
    qty: num(r.qty),
    kind: r.kind as OrderKind,
    status: r.status as OrderStatus,
    holdReason: (r.hold_reason as string | null) ?? null,
    driverId: (r.driver_id as string | null) ?? null,
    driverName: (r.driver_name as string | null) ?? null,
    serviceDate: String(r.service_date),
    timeWindow: r.time_window as TimeWindow,
    unitPrice: num(r.unit_price),
    amount: num(r.amount),
    payment: r.payment as Payment,
    deliveredQty: r.delivered_qty == null ? null : num(r.delivered_qty),
    collectedEmpties: r.collected_empties == null ? null : num(r.collected_empties),
    failReason: (r.fail_reason as string | null) ?? null,
    failCount: num(r.fail_count),
    source: r.source as "app" | "office",
    createdAt: new Date(r.created_at as string).toISOString(),
    deliveredAt: r.delivered_at ? new Date(r.delivered_at as string).toISOString() : null,
  };
}

async function cylinderTypes(sql: Sql): Promise<CylinderType[]> {
  const rows = await sql<Record<string, unknown>>`select * from ops_cylinder_types order by sort`;
  return rows.map((r) => ({
    code: String(r.code),
    nameHe: String(r.name_he),
    nameAr: String(r.name_ar),
    price: num(r.price),
    defaultCycleDays: num(r.default_cycle_days),
  }));
}

async function driverLoads(sql: Sql, day: string): Promise<DriverLoad[]> {
  const rows = await sql<Record<string, unknown>>`
    select d.id, d.zones, d.capacity, d.active,
           coalesce(sum(o.qty) filter (where o.status in ('assigned', 'on_the_way', 'failed')), 0) as load
    from ops_drivers d
    left join ops_orders o on o.driver_id = d.id and o.service_date = ${day}
    group by d.id`;
  return rows.map((r) => ({
    id: String(r.id),
    zones: (r.zones as string[]) ?? [],
    capacity: num(r.capacity),
    active: Boolean(r.active),
    load: num(r.load),
  }));
}

/** Assign an order automatically, or hold it for the office with a reason. */
async function autoAssign(tx: Sql, orderId: string, actor: string) {
  const [o] = await tx<Record<string, unknown>>`
    select o.qty, o.service_date, a.zone, c.balance
    from ops_orders o join ops_addresses a on a.id = o.address_id join ops_customers c on c.id = o.customer_id
    where o.id = ${orderId}`;
  const b = await business(tx);
  const result = triage({
    zone: String(o.zone),
    qty: num(o.qty),
    balance: num(o.balance),
    debtThreshold: b.debt_threshold,
    drivers: await driverLoads(tx, String(o.service_date)),
  });
  if ("driverId" in result) {
    await tx`update ops_orders set status = 'assigned', driver_id = ${result.driverId}, hold_reason = null,
             updated_at = now() where id = ${orderId}`;
    await logEvent(tx, { orderId, actor, kind: "assigned", detail: { driverId: result.driverId } });
  } else {
    await tx`update ops_orders set status = 'new', driver_id = null, hold_reason = ${result.hold},
             updated_at = now() where id = ${orderId}`;
    await logEvent(tx, { orderId, actor, kind: "held", detail: { reason: result.hold } });
  }
}

async function createOrder(
  tx: Sql,
  input: {
    customerId: string;
    typeCode: string;
    qty: number;
    kind: OrderKind;
    timeWindow: TimeWindow;
    source: "app" | "office";
    actor: string;
  },
): Promise<string> {
  const [addr] = await tx<{ id: string }>`
    select id from ops_addresses where customer_id = ${input.customerId}
    order by is_default desc, created_at desc limit 1`;
  if (!addr) throw new OpsError("invalid", "customer has no address");
  const [type] = await tx<{
    price: string;
  }>`select price from ops_cylinder_types where code = ${input.typeCode}`;
  if (!type) throw new OpsError("invalid", "unknown cylinder type");
  const b = await business(tx);
  const id = newId();
  await tx`insert into ops_orders (id, customer_id, address_id, type_code, qty, kind, service_date, time_window,
                                   unit_price, source)
           values (${id}, ${input.customerId}, ${addr.id}, ${input.typeCode}, ${input.qty}, ${input.kind},
                   ${serviceDateFor(new Date(), b.cutoff_hour)}, ${input.timeWindow}, ${num(type.price)},
                   ${input.source})`;
  await logEvent(tx, {
    orderId: id,
    customerId: input.customerId,
    actor: input.actor,
    kind: "created",
  });
  await autoAssign(tx, id, "system");
  return id;
}

// ---------- customer ----------

async function customerByToken(sql: Sql, token: string): Promise<CustomerRow> {
  const [c] = await sql<
    Record<string, unknown>
  >`select * from ops_customers where token = ${token}`;
  if (!c) throw new OpsError("forbidden", "unknown link");
  return {
    id: String(c.id),
    name: String(c.name),
    phone: String(c.phone),
    lang: c.lang as Lang,
    balance: num(c.balance),
    cycleDays: c.cycle_days == null ? null : num(c.cycle_days),
  };
}

export async function getCustomerHome(token: string): Promise<CustomerHome> {
  const sql = await ready();
  const c = await customerByToken(sql, token);
  const b = await business(sql);
  const types = await cylinderTypes(sql);
  const orders = (
    await sql.query<Record<string, unknown>>(
      `${ORDER_VIEW} where o.customer_id = $1 order by o.created_at desc limit 12`,
      [c.id],
    )
  ).map(toOrderView);
  const open = orders.find((o) => OPEN_STATUSES.includes(o.status)) ?? null;
  const last = orders.find((o) => o.status === "delivered") ?? orders[0] ?? null;
  const stock = await sql<Record<string, unknown>>`
    select type_code, held, empties_owed, last_delivery from ops_customer_cylinders where customer_id = ${c.id}`;
  const day = today();
  const cylinders = await Promise.all(
    stock.map(async (s) => {
      const type = types.find((t) => t.code === s.type_code);
      const dates = (
        await sql<{ d: string }>`select service_date as d from ops_orders
                                 where customer_id = ${c.id} and type_code = ${s.type_code} and status = 'delivered'
                                 order by service_date desc limit 4`
      ).map((r) => r.d);
      const cycle = cycleDays(dates, type?.defaultCycleDays ?? 28, c.cycleDays);
      const lastDelivery = (s.last_delivery as string | null) ?? null;
      return {
        typeCode: String(s.type_code),
        held: num(s.held),
        emptiesOwed: num(s.empties_owed),
        lastDelivery,
        cycleDays: cycle,
        refillDue: isRefillDue(lastDelivery, cycle, day, open !== null),
      };
    }),
  );
  return {
    today: day,
    name: c.name,
    lang: c.lang,
    balance: c.balance,
    businessName: b.name,
    businessPhone: b.phone,
    types,
    defaultOrder: last
      ? { typeCode: last.typeCode, qty: last.qty }
      : { typeCode: types[0]?.code ?? "12", qty: 1 },
    openOrder: open,
    history: orders.filter((o) => o.status === "delivered").slice(0, 8),
    cylinders,
  };
}

export async function customerPlaceOrder(
  token: string,
  input: { typeCode: string; qty: number; timeWindow: TimeWindow },
): Promise<{ orderId: string; alreadyOpen: boolean }> {
  const sql = await ready();
  const c = await customerByToken(sql, token);
  return withTransaction(async (tx) => {
    // One open order per customer: a second tap must not send two trucks.
    const [open] = await tx<{ id: string }>`
      select id from ops_orders where customer_id = ${c.id}
      and status in ('new', 'assigned', 'on_the_way', 'failed') limit 1`;
    if (open) return { orderId: open.id, alreadyOpen: true };
    const orderId = await createOrder(tx, {
      customerId: c.id,
      typeCode: input.typeCode,
      qty: input.qty,
      kind: "exchange",
      timeWindow: input.timeWindow,
      source: "app",
      actor: `customer:${c.id}`,
    });
    return { orderId, alreadyOpen: false };
  });
}

export async function customerCancelOrder(token: string, orderId: string): Promise<void> {
  const sql = await ready();
  const c = await customerByToken(sql, token);
  await withTransaction(async (tx) => {
    // After "on the way" only the office may cancel.
    const [o] = await tx<{ id: string }>`
      update ops_orders set status = 'cancelled', cancel_reason = 'customer', updated_at = now()
      where id = ${orderId} and customer_id = ${c.id} and status in ('new', 'assigned') returning id`;
    if (!o) throw new OpsError("conflict", "order can no longer be cancelled from the app");
    await logEvent(tx, { orderId, customerId: c.id, actor: `customer:${c.id}`, kind: "cancelled" });
  });
}

export async function customerTapCall(token: string): Promise<{ phone: string }> {
  const sql = await ready();
  const c = await customerByToken(sql, token);
  await sql`insert into ops_call_taps (id, customer_id) values (${newId()}, ${c.id})`;
  return { phone: (await business(sql)).phone };
}

export async function customerSetLang(token: string, lang: Lang): Promise<void> {
  const sql = await ready();
  const c = await customerByToken(sql, token);
  await sql`update ops_customers set lang = ${lang} where id = ${c.id}`;
}

// ---------- driver ----------

async function driverByToken(sql: Sql, token: string): Promise<DriverRow> {
  const [d] = await sql<
    Record<string, unknown>
  >`select * from ops_drivers where token = ${token} and active`;
  if (!d) throw new OpsError("forbidden", "unknown link");
  return { id: String(d.id), name: String(d.name), lang: d.lang as Lang };
}

export async function getDriverDay(token: string): Promise<DriverDay> {
  const sql = await ready();
  const d = await driverByToken(sql, token);
  const day = today();
  const rows = (
    await sql.query<Record<string, unknown>>(
      `${ORDER_VIEW} where o.driver_id = $1 and o.service_date = $2 and o.status <> 'cancelled'`,
      [d.id, day],
    )
  ).map(toOrderView);
  const pending = orderStops(
    rows
      .filter((o) => o.status !== "delivered")
      .map((o) => ({
        ...o,
        time_window: o.timeWindow,
        house_no: o.houseNo,
        fail_count: o.failCount,
      })),
  );
  const done = rows.filter((o) => o.status === "delivered");
  return {
    name: d.name,
    lang: d.lang,
    date: day,
    stops: pending,
    done,
    cash: done.filter((o) => o.payment === "cash").reduce((s, o) => s + o.amount, 0),
  };
}

async function driverOrder(tx: Sql, driverId: string, orderId: string) {
  const [o] = await tx<Record<string, unknown>>`
    select * from ops_orders where id = ${orderId} and driver_id = ${driverId}`;
  if (!o) throw new OpsError("not_found", "not your stop");
  return o;
}

export async function driverOnTheWay(token: string, orderId: string): Promise<void> {
  const sql = await ready();
  const d = await driverByToken(sql, token);
  await withTransaction(async (tx) => {
    const o = await driverOrder(tx, d.id, orderId);
    if (o.status !== "assigned" && o.status !== "failed") return;
    await tx`update ops_orders set status = 'on_the_way', updated_at = now() where id = ${orderId}`;
    await logEvent(tx, { orderId, actor: `driver:${d.id}`, kind: "on_the_way" });
  });
}

export async function driverDelivered(
  token: string,
  orderId: string,
  input: {
    deliveredQty: number;
    collectedEmpties: number;
    payment: "cash" | "debt" | "transfer_claimed";
  },
): Promise<void> {
  const sql = await ready();
  const d = await driverByToken(sql, token);
  await withTransaction(async (tx) => {
    const o = await driverOrder(tx, d.id, orderId);
    if (o.status === "delivered" || o.status === "cancelled") {
      throw new OpsError("conflict", "stop already closed");
    }
    const kind = o.kind as OrderKind;
    const amount = kind === "pickup" ? 0 : input.deliveredQty * num(o.unit_price);
    const [c] = await tx<{
      balance: string;
    }>`select balance from ops_customers where id = ${o.customer_id}`;
    const money = settle(input.payment, amount, num(c.balance));
    await tx`update ops_customers set balance = ${money.balance} where id = ${o.customer_id}`;
    const [stock] = await tx<{ held: number; empties_owed: number }>`
      select held, empties_owed from ops_customer_cylinders
      where customer_id = ${o.customer_id} and type_code = ${o.type_code}`;
    const next = applyDelivery(
      stock ?? { held: 0, empties_owed: 0 },
      kind,
      input.deliveredQty,
      input.collectedEmpties,
    );
    await tx`insert into ops_customer_cylinders (customer_id, type_code, held, empties_owed, last_delivery)
             values (${o.customer_id}, ${o.type_code}, ${next.held}, ${next.empties_owed}, ${today()})
             on conflict (customer_id, type_code) do update
             set held = excluded.held, empties_owed = excluded.empties_owed, last_delivery = excluded.last_delivery`;
    await tx`update ops_orders set status = 'delivered', delivered_qty = ${input.deliveredQty},
             collected_empties = ${input.collectedEmpties}, payment = ${input.payment}, amount = ${amount},
             hold_reason = null, delivered_at = now(), updated_at = now() where id = ${orderId}`;
    await logEvent(tx, {
      orderId,
      customerId: String(o.customer_id),
      actor: `driver:${d.id}`,
      kind: "delivered",
      detail: { ...input, amount },
    });
  });
}

export async function driverFailed(token: string, orderId: string, reason: string): Promise<void> {
  const sql = await ready();
  const d = await driverByToken(sql, token);
  await withTransaction(async (tx) => {
    const o = await driverOrder(tx, d.id, orderId);
    if (!["assigned", "on_the_way", "failed"].includes(String(o.status))) {
      throw new OpsError("conflict", "stop already closed");
    }
    const next = afterFailure(num(o.fail_count), String(o.service_date));
    await tx`update ops_orders set status = ${next.flagOffice ? "assigned" : "failed"},
             fail_count = ${next.failCount}, fail_reason = ${reason}, service_date = ${next.serviceDate},
             hold_reason = ${next.flagOffice ? "failed_twice" : null}, updated_at = now() where id = ${orderId}`;
    await logEvent(tx, {
      orderId,
      actor: `driver:${d.id}`,
      kind: "failed",
      detail: { reason, ...next },
    });
  });
}

// ---------- office ----------

async function assertOwner(sql: Sql, token: string) {
  const b = await business(sql);
  if (!token || token !== b.owner_token) throw new OpsError("forbidden", "unknown link");
  return b;
}

export async function getOfficeBoard(token: string): Promise<OfficeBoard> {
  const sql = await ready();
  const b = await assertOwner(sql, token);
  const day = today();
  const orders = (
    await sql.query<Record<string, unknown>>(
      `${ORDER_VIEW} where (o.service_date = $1 and o.status <> 'cancelled')
         or o.status in ('new') or o.hold_reason is not null or o.payment = 'transfer_claimed'
       order by o.created_at`,
      [day],
    )
  ).map(toOrderView);
  const drivers = await sql<Record<string, unknown>>`select * from ops_drivers order by created_at`;
  const loads = await driverLoads(sql, day);
  const taps = await sql<Record<string, unknown>>`
    select t.id, t.at, c.id as customer_id, c.name, c.phone from ops_call_taps t
    join ops_customers c on c.id = t.customer_id
    where not t.handled and t.at > now() - interval '12 hours' order by t.at desc`;
  const customers = await listCustomersInner(sql);
  const refillDue = customers.filter((c) => c.refillDue);
  const todays = orders.filter((o) => o.serviceDate === day);
  return {
    businessName: b.name,
    date: day,
    held: orders.filter((o) => o.status === "new" || o.holdReason !== null),
    transfersToConfirm: orders.filter((o) => o.payment === "transfer_claimed"),
    today: todays.filter((o) => o.status !== "new"),
    drivers: drivers.map((d) => {
      const mine = todays.filter((o) => o.driverId === d.id);
      return {
        id: String(d.id),
        name: String(d.name),
        phone: String(d.phone),
        token: String(d.token),
        zones: (d.zones as string[]) ?? [],
        capacity: num(d.capacity),
        active: Boolean(d.active),
        load: loads.find((l) => l.id === d.id)?.load ?? 0,
        done: mine.filter((o) => o.status === "delivered").length,
        remaining: mine.filter((o) => o.status !== "delivered").length,
        cash: mine.filter((o) => o.payment === "cash").reduce((s, o) => s + o.amount, 0),
      };
    }),
    callTaps: taps.map((t): CallTap => ({
      id: String(t.id),
      at: new Date(t.at as string).toISOString(),
      customerId: String(t.customer_id),
      name: String(t.name),
      phone: String(t.phone),
    })),
    refillDue,
    summary: {
      delivered: todays.filter((o) => o.status === "delivered").length,
      remaining: todays.filter((o) => OPEN_STATUSES.includes(o.status)).length,
      cash: todays.filter((o) => o.payment === "cash").reduce((s, o) => s + o.amount, 0),
      newDebt: todays.filter((o) => o.payment === "debt").reduce((s, o) => s + o.amount, 0),
    },
  };
}

async function listCustomersInner(sql: Sql) {
  const day = today();
  const rows = await sql<Record<string, unknown>>`
    select c.*, a.street, a.house_no, a.zone, a.floor, a.entry_code, a.note as address_note,
           (select json_agg(json_build_object('type', cc.type_code, 'held', cc.held, 'owed', cc.empties_owed,
                                              'last', cc.last_delivery))
              from ops_customer_cylinders cc where cc.customer_id = c.id) as stock,
           exists (select 1 from ops_orders o where o.customer_id = c.id
                   and o.status in ('new', 'assigned', 'on_the_way', 'failed')) as has_open
    from ops_customers c
    left join lateral (select * from ops_addresses where customer_id = c.id
                       order by is_default desc, created_at desc limit 1) a on true
    order by c.name`;
  const types = await cylinderTypes(sql);
  const history = await sql<{ customer_id: string; type_code: string; dates: string[] }>`
    select customer_id, type_code, array_agg(service_date::text order by service_date desc) as dates
    from ops_orders where status = 'delivered' group by customer_id, type_code`;
  const datesFor = (customerId: string, type: string) =>
    (history.find((h) => h.customer_id === customerId && h.type_code === type)?.dates ?? []).slice(
      0,
      4,
    );
  return rows.map((r) => {
    const stock = ((typeof r.stock === "string" ? JSON.parse(r.stock) : r.stock) ?? []) as {
      type: string;
      held: number;
      owed: number;
      last: string | null;
    }[];
    const due = stock.some((s) =>
      isRefillDue(
        s.last,
        cycleDays(
          datesFor(String(r.id), s.type),
          types.find((t) => t.code === s.type)?.defaultCycleDays ?? 28,
          r.cycle_days == null ? null : num(r.cycle_days),
        ),
        day,
        Boolean(r.has_open),
      ),
    );
    return {
      id: String(r.id),
      name: String(r.name),
      phone: String(r.phone),
      lang: r.lang as Lang,
      token: String(r.token),
      balance: num(r.balance),
      street: String(r.street ?? ""),
      houseNo: String(r.house_no ?? ""),
      zone: String(r.zone ?? ""),
      floor: String(r.floor ?? ""),
      entryCode: String(r.entry_code ?? ""),
      addressNote: String(r.address_note ?? ""),
      held: stock.reduce((s, x) => s + num(x.held), 0),
      held12: num(stock.find((x) => x.type === "12")?.held),
      held48: num(stock.find((x) => x.type === "48")?.held),
      emptiesOwed: stock.reduce((s, x) => s + num(x.owed), 0),
      lastDelivery:
        stock
          .map((s) => s.last)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
      hasOpenOrder: Boolean(r.has_open),
      refillDue: due,
    };
  });
}

export async function officeListCustomers(token: string) {
  const sql = await ready();
  await assertOwner(sql, token);
  return listCustomersInner(sql);
}

export async function officeSaveCustomer(
  token: string,
  input: {
    id?: string;
    name: string;
    phone: string;
    lang: Lang;
    street: string;
    houseNo: string;
    zone: string;
    floor: string;
    entryCode: string;
    note: string;
    held12: number;
    held48: number;
  },
): Promise<{ id: string; token: string }> {
  const sql = await ready();
  await assertOwner(sql, token);
  const phone = input.phone.replace(/\D/g, "");
  if (phone.length < 9) throw new OpsError("invalid", "phone");
  return withTransaction(async (tx) => {
    const [dup] = await tx<{ id: string }>`select id from ops_customers where phone = ${phone}`;
    if (dup && dup.id !== input.id)
      throw new OpsError("conflict", "phone already belongs to a customer");
    let id = input.id;
    let customerToken: string;
    if (id) {
      const [row] = await tx<{ token: string }>`
        update ops_customers set name = ${input.name}, phone = ${phone}, lang = ${input.lang}
        where id = ${id} returning token`;
      if (!row) throw new OpsError("not_found", "customer");
      customerToken = row.token;
      await tx`update ops_addresses set street = ${input.street}, house_no = ${input.houseNo}, zone = ${input.zone},
               floor = ${input.floor}, entry_code = ${input.entryCode}, note = ${input.note}
               where id = (select id from ops_addresses where customer_id = ${id}
                           order by is_default desc, created_at desc limit 1)`;
    } else {
      id = newId();
      customerToken = newToken();
      await tx`insert into ops_customers (id, name, phone, lang, token)
               values (${id}, ${input.name}, ${phone}, ${input.lang}, ${customerToken})`;
      await tx`insert into ops_addresses (id, customer_id, street, house_no, zone, floor, entry_code, note)
               values (${newId()}, ${id}, ${input.street}, ${input.houseNo}, ${input.zone}, ${input.floor},
                       ${input.entryCode}, ${input.note})`;
    }
    for (const [code, held] of [
      ["12", input.held12],
      ["48", input.held48],
    ] as const) {
      await tx`insert into ops_customer_cylinders (customer_id, type_code, held) values (${id}, ${code}, ${held})
               on conflict (customer_id, type_code) do update set held = excluded.held`;
    }
    await logEvent(tx, {
      customerId: id,
      actor: "office",
      kind: input.id ? "customer_updated" : "customer_created",
    });
    return { id, token: customerToken };
  });
}

export async function officeCreateOrder(
  token: string,
  input: {
    customerId: string;
    typeCode: string;
    qty: number;
    kind: OrderKind;
    timeWindow: TimeWindow;
  },
): Promise<{ orderId: string }> {
  const sql = await ready();
  await assertOwner(sql, token);
  return withTransaction(async (tx) => ({
    orderId: await createOrder(tx, { ...input, source: "office", actor: "office" }),
  }));
}

/** Phone caller or refill reminder: repeat the customer's last order (defaults: one 12 kg). */
export async function officeOrderLikeLast(
  token: string,
  customerId: string,
): Promise<{ orderId: string }> {
  const sql = await ready();
  await assertOwner(sql, token);
  return withTransaction(async (tx) => {
    const [open] = await tx<{ id: string }>`
      select id from ops_orders where customer_id = ${customerId}
      and status in ('new', 'assigned', 'on_the_way', 'failed') limit 1`;
    if (open) return { orderId: open.id };
    const [last] = await tx<{ type_code: string; qty: number }>`
      select type_code, qty from ops_orders where customer_id = ${customerId} and status = 'delivered'
      order by delivered_at desc nulls last limit 1`;
    const orderId = await createOrder(tx, {
      customerId,
      typeCode: last?.type_code ?? "12",
      qty: last ? num(last.qty) : 1,
      kind: "exchange",
      timeWindow: "any",
      source: "office",
      actor: "office",
    });
    await tx`update ops_call_taps set handled = true where customer_id = ${customerId} and not handled`;
    return { orderId };
  });
}

export async function officeAssign(
  token: string,
  orderId: string,
  driverId: string | null,
): Promise<void> {
  const sql = await ready();
  await assertOwner(sql, token);
  await withTransaction(async (tx) => {
    if (driverId === null) {
      // Office approves a held order (e.g. high debt): let the automation place it.
      await tx`update ops_orders set hold_reason = null where id = ${orderId}`;
      const [o] = await tx<Record<string, unknown>>`
        select o.qty, o.service_date, a.zone from ops_orders o join ops_addresses a on a.id = o.address_id
        where o.id = ${orderId}`;
      const pick = pickDriver(
        String(o.zone),
        num(o.qty),
        await driverLoads(tx, String(o.service_date)),
      );
      if ("hold" in pick) {
        await tx`update ops_orders set hold_reason = ${pick.hold} where id = ${orderId}`;
        await logEvent(tx, {
          orderId,
          actor: "office",
          kind: "held",
          detail: { reason: pick.hold },
        });
        return;
      }
      driverId = pick.driverId;
    }
    await tx`update ops_orders set status = 'assigned', driver_id = ${driverId}, hold_reason = null,
             updated_at = now() where id = ${orderId} and status in ('new', 'assigned', 'failed')`;
    await logEvent(tx, { orderId, actor: "office", kind: "assigned", detail: { driverId } });
  });
}

export async function officeCancel(token: string, orderId: string, reason: string): Promise<void> {
  const sql = await ready();
  await assertOwner(sql, token);
  await withTransaction(async (tx) => {
    const [o] = await tx<{ id: string }>`
      update ops_orders set status = 'cancelled', cancel_reason = ${reason}, hold_reason = null, updated_at = now()
      where id = ${orderId} and status in ('new', 'assigned', 'on_the_way', 'failed') returning id`;
    if (!o) throw new OpsError("conflict", "order is closed");
    await logEvent(tx, { orderId, actor: "office", kind: "cancelled", detail: { reason } });
  });
}

export async function officeConfirmTransfer(token: string, orderId: string): Promise<void> {
  const sql = await ready();
  await assertOwner(sql, token);
  await withTransaction(async (tx) => {
    const [o] = await tx<{ customer_id: string; amount: string }>`
      update ops_orders set payment = 'transfer_confirmed', updated_at = now()
      where id = ${orderId} and payment = 'transfer_claimed' returning customer_id, amount`;
    if (!o) throw new OpsError("conflict", "no transfer waiting");
    const [c] = await tx<{
      balance: string;
    }>`select balance from ops_customers where id = ${o.customer_id}`;
    await tx`update ops_customers set balance = ${confirmTransfer(num(o.amount), num(c.balance))}
             where id = ${o.customer_id}`;
    await logEvent(tx, {
      orderId,
      customerId: o.customer_id,
      actor: "office",
      kind: "transfer_confirmed",
    });
  });
}

export async function officeRecordPayment(
  token: string,
  customerId: string,
  amount: number,
): Promise<void> {
  const sql = await ready();
  await assertOwner(sql, token);
  if (!(amount > 0)) throw new OpsError("invalid", "amount");
  await withTransaction(async (tx) => {
    await tx`update ops_customers set balance = balance - ${amount} where id = ${customerId}`;
    await logEvent(tx, { customerId, actor: "office", kind: "payment", detail: { amount } });
  });
}

export async function officeHandleCall(token: string, tapId: string): Promise<void> {
  const sql = await ready();
  await assertOwner(sql, token);
  await sql`update ops_call_taps set handled = true where id = ${tapId}`;
}

export async function officeSaveDriver(
  token: string,
  input: {
    id?: string;
    name: string;
    phone: string;
    lang: Lang;
    zones: string[];
    capacity: number;
    active: boolean;
  },
): Promise<{ id: string; token: string }> {
  const sql = await ready();
  await assertOwner(sql, token);
  const zones = input.zones.map((z) => z.trim()).filter(Boolean);
  if (input.id) {
    const [row] = await sql<{ token: string }>`
      update ops_drivers set name = ${input.name}, phone = ${input.phone}, lang = ${input.lang}, zones = ${zones},
             capacity = ${input.capacity}, active = ${input.active} where id = ${input.id} returning token`;
    if (!row) throw new OpsError("not_found", "driver");
    return { id: input.id, token: row.token };
  }
  const id = newId();
  const driverToken = newToken();
  await sql`insert into ops_drivers (id, name, phone, lang, token, zones, capacity, active)
            values (${id}, ${input.name}, ${input.phone}, ${input.lang}, ${driverToken}, ${zones},
                    ${input.capacity}, ${input.active})`;
  return { id, token: driverToken };
}

export async function officeGetSettings(token: string) {
  const sql = await ready();
  const b = await assertOwner(sql, token);
  return {
    name: b.name,
    phone: b.phone,
    cutoffHour: b.cutoff_hour,
    debtThreshold: b.debt_threshold,
    types: await cylinderTypes(sql),
  };
}

export async function officeSaveSettings(
  token: string,
  input: {
    name: string;
    phone: string;
    cutoffHour: number;
    debtThreshold: number;
    prices: Record<string, number>;
  },
): Promise<void> {
  const sql = await ready();
  await assertOwner(sql, token);
  await withTransaction(async (tx) => {
    await tx`update ops_business set name = ${input.name}, phone = ${input.phone}, cutoff_hour = ${input.cutoffHour},
             debt_threshold = ${input.debtThreshold} where id = 'main'`;
    for (const [code, price] of Object.entries(input.prices)) {
      await tx`update ops_cylinder_types set price = ${price} where code = ${code}`;
    }
    await logEvent(tx, { actor: "office", kind: "settings", detail: input });
  });
}

export type { HoldReason };
