/**
 * מסלול מלא של יום עבודה במערכת, בדפדפן אמיתי בגודל טלפון.
 * רץ דרך `npm run e2e` (scripts/run-e2e.mjs), שמרים שרת עם נתוני דמו נקיים.
 * הבדיקות רצות לפי הסדר: כל אחת ממשיכה מהמצב שהקודמת השאירה.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:8090";
const OUT = "e2e-results";
mkdirSync(OUT, { recursive: true });

// Claude cloud sessions ship Chromium here; elsewhere Playwright finds its own.
const bundled = "/opt/pw-browsers/chromium";
const executablePath = process.env.CHROMIUM_PATH || (existsSync(bundled) ? bundled : undefined);

let browser;
const consoleErrors = [];

async function open(path, { width = 390, height = 844 } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => consoleErrors.push(`${path}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${path}: ${m.text()}`));
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  return page;
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

before(async () => {
  browser = await chromium.launch({ executablePath });
  // First visits make the dev server bundle client code and may reload the page once;
  // do that here so it never lands in the middle of a test.
  for (const path of ["/o/demo-owner", "/c/demo-c1", "/d/demo-d1"]) {
    const page = await open(path);
    await page.waitForTimeout(2500);
    await page.close();
  }
  consoleErrors.length = 0;
});

after(async () => {
  await browser?.close();
});

test("משרד: קובע מחירים להגדרות", async () => {
  const office = await open("/o/demo-owner", { width: 1100, height: 900 });
  await office.getByRole("button", { name: "הגדרות" }).click();
  const field = (label) => office.locator("label", { hasText: label }).locator("input");
  await field("מחיר · בלון 12").fill("100");
  await field("מחיר · בלון 48").fill("350");
  await office.getByRole("button", { name: "שמירה" }).click();
  await office.getByText("נשמר").waitFor();
  await office.close();
});

test("לקוח: מזמין כמו בפעם הקודמת, וההזמנה משובצת לבד לנהג של האזור", async () => {
  const c = await open("/c/demo-c3"); // מרים, אזור דרום → הנהג ראמי
  await c.getByRole("button", { name: /اطلب مثل المرة السابقة/ }).click();
  await c.getByRole("button", { name: "تأكيد" }).click();
  await c.getByText("تم استلام الطلب").waitFor();
  await c.getByText("في الدور لليوم").waitFor();
  await c.getByText("ראמי").waitFor();
  await shot(c, "1-customer-ordered");
  await c.close();
});

test("לקוח: לחיצה כפולה לא יוצרת שתי הזמנות", async () => {
  const c = await open("/c/demo-c3");
  const orderButton = c.getByRole("button", { name: /اطلب مثل المرة السابقة/ });
  assert.equal(await orderButton.isDisabled(), true);
  await c.close();
});

test("לקוח: לחיצה על «התקשר» מופיעה במשרד", async () => {
  const c = await open("/c/demo-c2"); // סלים, ממשק בעברית
  await c.route("tel:*", (r) => r.abort());
  await c
    .getByRole("button", { name: "התקשר" })
    .click()
    .catch(() => {});
  await c.waitForTimeout(800);
  await c.close();

  const office = await open("/o/demo-owner", { width: 1100, height: 900 });
  await office.getByText("סלים חדאד").first().waitFor();
  await office.getByText("לחץ «התקשר»").waitFor();
  await shot(office, "2-office-call-tap");
  await office.close();
});

test("נהג: יוצא, מוסר בחוב — והלקוח רואה את החוב וההיסטוריה", async () => {
  const d = await open("/d/demo-d2");
  await d.getByText("شارع المدارس 27").waitFor();
  await d.getByRole("button", { name: "انطلقت" }).click();
  await d.getByRole("button", { name: "تم التوصيل" }).first().click();
  await d.getByRole("button", { name: "دين" }).click();
  await shot(d, "3-driver-delivering");
  await d.getByRole("button", { name: "تأكيد" }).click();
  await d.getByText("أنهيت كل محطات اليوم").waitFor();
  await d.close();

  const c = await open("/c/demo-c3");
  await c.getByText("مبلغ مستحق").waitFor();
  await c.getByText("₪100").waitFor();
  await c.getByText("لا يوجد طلب مفتوح الآن").waitFor();
  assert.equal((await c.getByText("× جرة 12 كغ").count()) >= 2, true, "two deliveries in history");
  await shot(c, "4-customer-after-delivery");
  await c.close();
});

test("לקוח באזור בלי נהג: ההזמנה נעצרת במשרד, שיבוץ ידני, ושני כישלונות מעבירים למחר", async () => {
  const office = await open("/o/demo-owner", { width: 1100, height: 900 });
  await office.getByRole("button", { name: "לקוחות" }).click();
  await office.getByRole("button", { name: "לקוח חדש" }).click();
  const field = (label) => office.locator("label", { hasText: label }).locator("input").first();
  await field("שם").fill("נאדר חורי");
  await field("טלפון").fill("0507770001");
  await field("רחוב").fill("רחוב הגפן");
  await field("מספר").fill("5");
  await field("אזור").fill("מערב");
  await office.getByRole("button", { name: "שמירה" }).click();
  const row = office.locator("section", { hasText: "נאדר חורי" });
  await row.getByRole("button", { name: "הזמנה כמו קודם" }).click();
  await office.waitForTimeout(800);

  await office.getByRole("button", { name: "היום" }).click();
  await office.getByText("אין נהג לאזור").waitFor();
  await shot(office, "5-office-held");
  await office.getByRole("button", { name: "שבץ לסאמר" }).click();
  await office.getByText("אין נהג לאזור").waitFor({ state: "detached" });

  const d = await open("/d/demo-d1");
  for (let i = 0; i < 2; i++) {
    await d.getByRole("button", { name: "لم أتمكن" }).click();
    await d.getByRole("button", { name: "لا أحد في البيت" }).click();
    await d.waitForTimeout(1000);
  }
  await d.getByText("أنهيت كل محطات اليوم").waitFor();
  await d.close();

  await office.reload({ waitUntil: "networkidle" });
  await office.getByText("נכשל פעמיים — עבר למחר").waitFor();
  await shot(office, "6-office-failed-twice");
  await office.close();
});

test("לקוח: מעבר שפה לעברית", async () => {
  const c = await open("/c/demo-c1");
  await c.getByRole("button", { name: "עברית" }).click();
  await c.getByRole("button", { name: /הזמן כמו בפעם הקודמת/ }).waitFor();
  await c.getByText("אצלך בבית").waitFor();
  await c.close();
});

test("אין שגיאות בקונסול של הדפדפן לאורך כל המסלול", () => {
  assert.deepEqual(consoleErrors, []);
});
