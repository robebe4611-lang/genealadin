// Captures the real GazFlow UI states for the promo film from the demo page.
// One order flows: driver loads → customer orders → office sees it assigned → driver delivers → everyone updates.
// The page is not modified; capture.css only hides the demo chrome (top bar, "demo" labels, helper toasts).
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, "shots");
mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(readFileSync(path.join(DIR, "app.html")));
}).listen(8123);

const chromeCss = `
  .top, #demo-who, .demo-note, #toasts, .col-head { display: none !important; }
  .cols { padding: 0 !important; }
  .phone { border-radius: 0 !important; box-shadow: none !important; min-height: 100vh !important; max-width: none !important; }
`;
// Office alone on a laptop screen: same UI, wider column.
const officeWideCss = `
  #col-customer, #col-driver { display: none !important; }
  .cols { display: block !important; padding: 28px 40px !important; }
  #col-office { display: block !important; }
  #office.stack { max-width: 1100px !important; }
`;
// All three side by side on a wide screen (the signature shot).
const trioCss = `
  .cols { padding: 24px 32px !important; gap: 28px !important; }
  .phone { border-radius: 40px !important; box-shadow: 0 0 0 8px var(--green), 0 24px 60px rgba(0,80,40,.18) !important; min-height: 820px !important; max-width: 400px !important; }
`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errors = [];

async function open(viewport, css) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, timezoneId: "Asia/Jerusalem", locale: "he-IL" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-10-12T08:12:00+03:00") });
  await page.goto("http://127.0.0.1:8123/");
  await page.addStyleTag({ content: chromeCss + css });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
const at = (page, hhmm) => page.clock.setSystemTime(new Date(`2026-10-12T${hhmm}:00+03:00`));
const tab = (page, t) => page.evaluate((t) => document.querySelector(`.tab[data-tab=${t}]`).click(), t);
const click = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
// Fake clock for app timers + a real wait so the browser's view transitions (≈0.4s) finish.
const settle = async (page, ms = 450) => { await page.clock.runFor(ms); await page.waitForTimeout(700); };

// Where the finger taps, in 390x844 CSS pixels (the film draws a tap ring there).
const taps = {};
const box = async (page, sel) => { const b = await page.locator(sel).boundingBox(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; };

// ---------- mobile: each app in a 390x844 phone ----------
{
  const p = await open({ width: 390, height: 844 }, "");
  const snap = async (name, t, full) => { await tab(p, t); await settle(p); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!full }); };

  await snap("o01-office-morning", "office", true);
  // Driver loads the truck before leaving.
  await tab(p, "driver");
  for (let i = 0; i < 6; i++) await click(p, '[data-lq="12"][data-n="1"]');
  for (let i = 0; i < 2; i++) await click(p, '[data-lq="48"][data-n="1"]');
  await snap("d00-driver-loading", "driver");
  await at(p, "08:20");
  await click(p, "[data-load]");
  await snap("d01-driver-loaded", "driver");

  // Customer (Salim, north zone → Samer) orders like last time.
  await at(p, "08:31");
  await snap("c01-customer-idle", "customer");
  taps.order = await box(p, '[data-act="order"]');
  await click(p, '[data-act="order"]');
  await snap("c02-customer-sheet", "customer");
  taps.confirm = await box(p, "[data-confirm]");
  await click(p, "[data-confirm]");
  await p.clock.runFor(100); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/c03-customer-skeleton.png` });
  await settle(p, 700);
  await p.screenshot({ path: `${OUT}/c04-customer-ordered-notif.png` });
  await settle(p, 5000);
  await p.screenshot({ path: `${OUT}/c05-customer-ordered.png` });
  await snap("o02-office-new-order", "office", true);
  await snap("d02-driver-stop", "driver");
  taps.way = await box(p, "[data-way]");

  // Driver leaves.
  await at(p, "08:40");
  await click(p, "[data-way]");
  await tab(p, "customer"); await settle(p, 500);
  await p.screenshot({ path: `${OUT}/c06-customer-ontheway-notif.png` });
  await settle(p, 5000);
  await p.screenshot({ path: `${OUT}/c07-customer-ontheway.png` });
  await snap("o03-office-ontheway", "office", true);
  await snap("d02b-driver-ontheway", "driver");
  taps.delivered = await box(p, '[data-mode="deliver"]');

  // Delivered.
  await at(p, "08:58");
  await tab(p, "driver");
  await click(p, '[data-mode="deliver"]');
  await snap("d03-driver-deliver-form", "driver");
  await click(p, "[data-deliver]");
  await snap("d04-driver-done", "driver");
  await tab(p, "customer"); await settle(p, 500);
  await p.screenshot({ path: `${OUT}/c08-customer-delivered-notif.png` });
  await settle(p, 5000);
  await p.screenshot({ path: `${OUT}/c09-customer-delivered.png` });
  await snap("o04-office-delivered", "office", true);
  await p.context().close();
}

// ---------- laptop: the office alone at 1440x900 ----------
{
  const p = await open({ width: 1440, height: 900 }, officeWideCss);
  await p.screenshot({ fullPage: true, path: `${OUT}/L01-office-morning.png` });
  await at(p, "08:20");
  for (let i = 0; i < 6; i++) await click(p, '[data-lq="12"][data-n="1"]');
  for (let i = 0; i < 2; i++) await click(p, '[data-lq="48"][data-n="1"]');
  await click(p, "[data-load]");
  await at(p, "08:31");
  await click(p, '[data-act="order"]'); await click(p, "[data-confirm]");
  await settle(p, 900);
  await p.screenshot({ fullPage: true, path: `${OUT}/L02-office-new-order.png` });
  await at(p, "08:40"); await click(p, "[data-way]"); await settle(p);
  await p.screenshot({ fullPage: true, path: `${OUT}/L03-office-ontheway.png` });
  await at(p, "08:58"); await click(p, '[data-mode="deliver"]'); await click(p, "[data-deliver]"); await settle(p);
  await p.screenshot({ fullPage: true, path: `${OUT}/L04-office-delivered.png` });
  await p.context().close();
}

// ---------- wide: all three side by side (signature moment) ----------
{
  const p = await open({ width: 1440, height: 900 }, trioCss);
  await at(p, "08:20");
  for (let i = 0; i < 6; i++) await click(p, '[data-lq="12"][data-n="1"]');
  for (let i = 0; i < 2; i++) await click(p, '[data-lq="48"][data-n="1"]');
  await click(p, "[data-load]");
  await at(p, "08:31");
  await p.screenshot({ path: `${OUT}/T01-trio-before.png` });
  await click(p, '[data-act="order"]'); await click(p, "[data-confirm]");
  await settle(p, 900);
  await p.screenshot({ path: `${OUT}/T02-trio-ordered.png` });
  await at(p, "08:40"); await click(p, "[data-way]"); await settle(p);
  await p.screenshot({ path: `${OUT}/T03-trio-ontheway.png` });
  await at(p, "08:58"); await click(p, '[data-mode="deliver"]'); await click(p, "[data-deliver]"); await settle(p, 300);
  await p.screenshot({ path: `${OUT}/T04-trio-delivered.png` });
  await p.context().close();
}

writeFileSync(path.join(DIR, "taps.json"), JSON.stringify(taps, null, 2));
await browser.close();
server.close();
console.log(errors.length ? "page errors: " + errors.join(" | ") : "no page errors");
