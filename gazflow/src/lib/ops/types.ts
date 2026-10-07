import type { OrderKind, OrderStatus, Payment, TimeWindow } from "./logic";

export type Lang = "ar" | "he";

export type CylinderType = {
  code: string;
  nameHe: string;
  nameAr: string;
  price: number;
  defaultCycleDays: number;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  lang: Lang;
  balance: number;
  cycleDays: number | null;
};

export type DriverRow = { id: string; name: string; lang: Lang };

export type OrderView = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerBalance: number;
  street: string;
  houseNo: string;
  zone: string;
  floor: string;
  entryCode: string;
  addressNote: string;
  typeCode: string;
  typeHe: string;
  typeAr: string;
  qty: number;
  kind: OrderKind;
  status: OrderStatus;
  holdReason: string | null;
  driverId: string | null;
  driverName: string | null;
  serviceDate: string;
  timeWindow: TimeWindow;
  unitPrice: number;
  amount: number;
  payment: Payment;
  deliveredQty: number | null;
  collectedEmpties: number | null;
  failReason: string | null;
  failCount: number;
  source: "app" | "office";
  createdAt: string;
  deliveredAt: string | null;
};

export type CustomerCylinders = {
  typeCode: string;
  held: number;
  emptiesOwed: number;
  lastDelivery: string | null;
  cycleDays: number;
  refillDue: boolean;
};

export type CustomerHome = {
  today: string;
  name: string;
  lang: Lang;
  balance: number;
  businessName: string;
  businessPhone: string;
  types: CylinderType[];
  defaultOrder: { typeCode: string; qty: number };
  openOrder: OrderView | null;
  history: OrderView[];
  cylinders: CustomerCylinders[];
};

export type DriverDay = {
  name: string;
  lang: Lang;
  date: string;
  stops: OrderView[];
  done: OrderView[];
  cash: number;
};

export type CallTap = { id: string; at: string; customerId: string; name: string; phone: string };

export type OfficeCustomer = {
  id: string;
  name: string;
  phone: string;
  lang: Lang;
  token: string;
  balance: number;
  street: string;
  houseNo: string;
  zone: string;
  floor: string;
  entryCode: string;
  addressNote: string;
  held: number;
  held12: number;
  held48: number;
  emptiesOwed: number;
  lastDelivery: string | null;
  hasOpenOrder: boolean;
  refillDue: boolean;
};

export type OfficeDriver = {
  id: string;
  name: string;
  phone: string;
  token: string;
  zones: string[];
  capacity: number;
  active: boolean;
  load: number;
  done: number;
  remaining: number;
  cash: number;
};

export type OfficeBoard = {
  businessName: string;
  date: string;
  held: OrderView[];
  transfersToConfirm: OrderView[];
  today: OrderView[];
  drivers: OfficeDriver[];
  callTaps: CallTap[];
  refillDue: OfficeCustomer[];
  summary: { delivered: number; remaining: number; cash: number; newDebt: number };
};
