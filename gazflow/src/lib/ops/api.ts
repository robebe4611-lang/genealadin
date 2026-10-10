/**
 * Browser-callable server functions. Each validates its input, then loads the
 * server-only service on demand so no database code reaches the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const token = z.string().min(4).max(200);
const lang = z.enum(["ar", "he"]);
const window_ = z.enum(["morning", "noon", "afternoon", "any"]);
const kind = z.enum(["exchange", "install", "pickup"]);
const qty = z.number().int().min(1).max(10);

const svc = () => import("./service.server");

/** Turn service errors into a short code the UI can translate. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const { OpsError } = await svc();
    if (err instanceof OpsError) throw new Error(`ops:${err.code}`);
    console.error("[ops]", err);
    throw new Error("ops:server");
  }
}

// ---------- customer ----------

export const getCustomerHome = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(({ data }) => call(async () => (await svc()).getCustomerHome(data.token)));

export const customerPlaceOrder = createServerFn({ method: "POST" })
  .validator(z.object({ token, typeCode: z.string().max(8), qty, timeWindow: window_ }))
  .handler(({ data }) => call(async () => (await svc()).customerPlaceOrder(data.token, data)));

export const customerCancelOrder = createServerFn({ method: "POST" })
  .validator(z.object({ token, orderId: z.string().max(64) }))
  .handler(({ data }) =>
    call(async () => (await svc()).customerCancelOrder(data.token, data.orderId)),
  );

export const customerTapCall = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(({ data }) => call(async () => (await svc()).customerTapCall(data.token)));

export const customerSetLang = createServerFn({ method: "POST" })
  .validator(z.object({ token, lang }))
  .handler(({ data }) => call(async () => (await svc()).customerSetLang(data.token, data.lang)));

// ---------- driver ----------

export const getDriverDay = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(({ data }) => call(async () => (await svc()).getDriverDay(data.token)));

export const driverOnTheWay = createServerFn({ method: "POST" })
  .validator(z.object({ token, orderId: z.string().max(64) }))
  .handler(({ data }) => call(async () => (await svc()).driverOnTheWay(data.token, data.orderId)));

export const driverDelivered = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      orderId: z.string().max(64),
      deliveredQty: z.number().int().min(0).max(10),
      collectedEmpties: z.number().int().min(0).max(10),
      payment: z.enum(["cash", "debt", "transfer_claimed"]),
    }),
  )
  .handler(({ data }) =>
    call(async () => (await svc()).driverDelivered(data.token, data.orderId, data)),
  );

export const driverFailed = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      orderId: z.string().max(64),
      reason: z.enum(["no_one_home", "wrong_address", "refused"]),
    }),
  )
  .handler(({ data }) =>
    call(async () => (await svc()).driverFailed(data.token, data.orderId, data.reason)),
  );

// ---------- office ----------

export const getOfficeBoard = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(({ data }) => call(async () => (await svc()).getOfficeBoard(data.token)));

export const officeListCustomers = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(({ data }) => call(async () => (await svc()).officeListCustomers(data.token)));

export const officeSaveCustomer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      id: z.string().max(64).optional(),
      name: z.string().trim().min(1).max(80),
      phone: z.string().trim().min(9).max(20),
      lang,
      street: z.string().trim().min(1).max(80),
      houseNo: z.string().trim().max(10),
      zone: z.string().trim().max(40),
      floor: z.string().trim().max(10),
      entryCode: z.string().trim().max(20),
      note: z.string().trim().max(200),
      held12: z.number().int().min(0).max(10),
      held48: z.number().int().min(0).max(10),
    }),
  )
  .handler(({ data }) => call(async () => (await svc()).officeSaveCustomer(data.token, data)));

export const officeCreateOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      customerId: z.string().max(64),
      typeCode: z.string().max(8),
      qty,
      kind,
      timeWindow: window_,
    }),
  )
  .handler(({ data }) => call(async () => (await svc()).officeCreateOrder(data.token, data)));

export const officeOrderLikeLast = createServerFn({ method: "POST" })
  .validator(z.object({ token, customerId: z.string().max(64) }))
  .handler(({ data }) =>
    call(async () => (await svc()).officeOrderLikeLast(data.token, data.customerId)),
  );

export const officeAssign = createServerFn({ method: "POST" })
  .validator(
    z.object({ token, orderId: z.string().max(64), driverId: z.string().max(64).nullable() }),
  )
  .handler(({ data }) =>
    call(async () => (await svc()).officeAssign(data.token, data.orderId, data.driverId)),
  );

export const officeCancel = createServerFn({ method: "POST" })
  .validator(
    z.object({ token, orderId: z.string().max(64), reason: z.string().trim().min(1).max(120) }),
  )
  .handler(({ data }) =>
    call(async () => (await svc()).officeCancel(data.token, data.orderId, data.reason)),
  );

export const officeConfirmTransfer = createServerFn({ method: "POST" })
  .validator(z.object({ token, orderId: z.string().max(64) }))
  .handler(({ data }) =>
    call(async () => (await svc()).officeConfirmTransfer(data.token, data.orderId)),
  );

export const officeRecordPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({ token, customerId: z.string().max(64), amount: z.number().positive().max(100000) }),
  )
  .handler(({ data }) =>
    call(async () => (await svc()).officeRecordPayment(data.token, data.customerId, data.amount)),
  );

export const officeHandleCall = createServerFn({ method: "POST" })
  .validator(z.object({ token, tapId: z.string().max(64) }))
  .handler(({ data }) => call(async () => (await svc()).officeHandleCall(data.token, data.tapId)));

export const officeSaveDriver = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      id: z.string().max(64).optional(),
      name: z.string().trim().min(1).max(60),
      phone: z.string().trim().max(20),
      lang,
      zones: z.array(z.string().max(40)).max(20),
      capacity: z.number().int().min(1).max(200),
      active: z.boolean(),
    }),
  )
  .handler(({ data }) => call(async () => (await svc()).officeSaveDriver(data.token, data)));

export const officeGetSettings = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(({ data }) => call(async () => (await svc()).officeGetSettings(data.token)));

export const officeSaveSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      name: z.string().trim().min(1).max(60),
      phone: z.string().trim().max(20),
      cutoffHour: z.number().int().min(0).max(23),
      debtThreshold: z.number().min(0).max(100000),
      prices: z.record(z.string(), z.number().min(0).max(10000)),
    }),
  )
  .handler(({ data }) => call(async () => (await svc()).officeSaveSettings(data.token, data)));
