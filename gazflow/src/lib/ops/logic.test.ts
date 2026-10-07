import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  afterFailure,
  applyDelivery,
  confirmTransfer,
  cycleDays,
  israelClock,
  isRefillDue,
  orderStops,
  pickDriver,
  serviceDateFor,
  settle,
  triage,
  type DriverLoad,
  type Stop,
} from "./logic.ts";

const driver = (over: Partial<DriverLoad>): DriverLoad => ({
  id: "d1",
  zones: [],
  capacity: 20,
  active: true,
  load: 0,
  ...over,
});

test("israelClock reads Israel time, not UTC", () => {
  // 2026-10-07 07:30 UTC = 10:30 in Israel (IDT, UTC+3).
  assert.deepEqual(israelClock(new Date("2026-10-07T07:30:00Z")), { date: "2026-10-07", hour: 10 });
  // 22:30 UTC is already the next day in Israel.
  assert.equal(israelClock(new Date("2026-10-07T22:30:00Z")).date, "2026-10-08");
});

test("orders before the cutoff are today, after it tomorrow", () => {
  assert.equal(serviceDateFor(new Date("2026-10-07T06:59:00Z"), 10), "2026-10-07"); // 09:59
  assert.equal(serviceDateFor(new Date("2026-10-07T07:00:00Z"), 10), "2026-10-08"); // 10:00
});

test("addDays crosses month ends", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("pickDriver: zone match, capacity, least loaded", () => {
  const drivers = [
    driver({ id: "a", zones: ["north"], load: 5 }),
    driver({ id: "b", zones: ["north"], load: 2 }),
    driver({ id: "c", zones: ["south"], load: 0 }),
  ];
  assert.deepEqual(pickDriver("north", 1, drivers), { driverId: "b" });
  assert.deepEqual(pickDriver("west", 1, drivers), { hold: "no_driver" });
  assert.deepEqual(pickDriver("", 1, drivers), { hold: "no_zone" });
});

test("pickDriver: a driver with no zones serves everywhere; full drivers are skipped", () => {
  const drivers = [
    driver({ id: "any", zones: [], load: 19 }),
    driver({ id: "n", zones: ["north"], load: 0 }),
  ];
  assert.deepEqual(pickDriver("east", 1, drivers), { driverId: "any" });
  assert.deepEqual(pickDriver("east", 2, drivers), { hold: "over_capacity" });
  assert.deepEqual(pickDriver("north", 1, [driver({ active: false })]), { hold: "no_driver" });
});

test("triage holds high debt for the office instead of refusing", () => {
  const drivers = [driver({})];
  assert.deepEqual(triage({ zone: "x", qty: 1, balance: 500, debtThreshold: 400, drivers }), {
    hold: "debt",
  });
  assert.deepEqual(triage({ zone: "x", qty: 1, balance: 400, debtThreshold: 400, drivers }), {
    driverId: "d1",
  });
});

test("orderStops: window, then street, then house number; failed stops last", () => {
  const s = (id: string, over: Partial<Stop>): Stop => ({
    id,
    time_window: "any",
    zone: "z",
    street: "הרצל",
    house_no: "1",
    fail_count: 0,
    ...over,
  });
  const ordered = orderStops([
    s("late", { time_window: "afternoon" }),
    s("h10", { house_no: "10" }),
    s("h2", { house_no: "2" }),
    s("morning", { time_window: "morning" }),
    s("skipped", { time_window: "morning", fail_count: 1 }),
  ]).map((x) => x.id);
  assert.deepEqual(ordered, ["morning", "h2", "h10", "late", "skipped"]);
});

test("cycleDays: manual lock, measured mean, default", () => {
  assert.equal(cycleDays(["2026-01-01", "2026-02-01", "2026-03-01"], 28, 40), 40);
  assert.equal(cycleDays(["2026-01-01", "2026-01-25", "2026-02-20"], 28, null), 25);
  assert.equal(cycleDays(["2026-01-01", "2026-01-25"], 28, null), 28); // fewer than 3 deliveries
  // A 90-day gap (customer was away) is ignored.
  assert.equal(cycleDays(["2026-01-01", "2026-04-01", "2026-04-21"], 28, null), 20);
});

test("refill is due two days before the cycle ends, never with an open order", () => {
  assert.equal(isRefillDue("2026-10-01", 28, "2026-10-26", false), false);
  assert.equal(isRefillDue("2026-10-01", 28, "2026-10-27", false), true);
  assert.equal(isRefillDue("2026-10-01", 28, "2026-11-30", true), false);
  assert.equal(isRefillDue(null, 28, "2026-11-30", false), false);
});

test("applyDelivery keeps the customer's cylinders honest", () => {
  assert.deepEqual(applyDelivery({ held: 2, empties_owed: 0 }, "exchange", 2, 2), {
    held: 2,
    empties_owed: 0,
  });
  assert.deepEqual(applyDelivery({ held: 2, empties_owed: 0 }, "exchange", 2, 1), {
    held: 2,
    empties_owed: 1,
  });
  assert.deepEqual(applyDelivery({ held: 2, empties_owed: 1 }, "exchange", 1, 2), {
    held: 2,
    empties_owed: 0,
  });
  assert.deepEqual(applyDelivery({ held: 0, empties_owed: 0 }, "install", 2, 0), {
    held: 2,
    empties_owed: 0,
  });
  assert.deepEqual(applyDelivery({ held: 2, empties_owed: 1 }, "pickup", 0, 1), {
    held: 1,
    empties_owed: 0,
  });
});

test("afterFailure: end of route first, tomorrow on the second failure", () => {
  assert.deepEqual(afterFailure(0, "2026-10-07"), {
    failCount: 1,
    serviceDate: "2026-10-07",
    flagOffice: false,
  });
  assert.deepEqual(afterFailure(1, "2026-10-07"), {
    failCount: 2,
    serviceDate: "2026-10-08",
    flagOffice: true,
  });
});

test("settle: debt and unconfirmed transfers are owed, cash goes to the driver's till", () => {
  assert.deepEqual(settle("debt", 90, 10), { balance: 100, cashToCollect: 0 });
  assert.deepEqual(settle("cash", 90, 10), { balance: 10, cashToCollect: 90 });
  assert.deepEqual(settle("transfer_claimed", 90, 10), { balance: 100, cashToCollect: 0 });
  assert.equal(confirmTransfer(90, 100), 10);
});
