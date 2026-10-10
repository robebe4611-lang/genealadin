// Version 3 captures (dark premium cut): routes, live statuses, fleet, stock. No billing on screen —
// the money card and the debts bar are hidden at capture time (the page itself is not modified).
// Scenario: Samer loads 10 small + 3 large, Rami 6 small. Salim, Nur, Ahmad (Samer) and Miriam (Rami) order.
// Samer delivers Salim, Rami delivers Miriam, Samer is on the way to Nur; Ahmad is next on his route.
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, "shots3");
mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(readFileSync(path.join(DIR, "app.html")));
}).listen(8125);

const chrome = `
  .top, #demo-who, .demo-note, #toasts, .col-head, #driver .who { display: none !important; }
  .cols { padding: 0 !important; }
  .phone { border-radius: 0 !important; box-shadow: none !important; min-height: 100vh !important; max-width: none !important; }
  #office.stack, #driver.stack { padding: 14px 12px !important; }
`;
const wide = `
  #col-customer, #col-driver { display: none !important; }
  .cols { display: block !important; padding: 28px 40px !important; }
  #col-office { display: block !important; }
  #office.stack { max-width: 1100px !important; }
`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errors = [];

async function run(viewport, dpr, extraCss, capture) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, timezoneId: "Asia/Jerusalem", locale: "he-IL" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.clock.install({ time: new Date("2026-10-12T07:40:00+03:00") });
  await p.goto("http://127.0.0.1:8125/");
  await p.addStyleTag({ content: chrome + extraCss });
  await p.evaluate(() => document.fonts.ready);
  const at = (hhmm) => p.clock.setSystemTime(new Date(`2026-10-12T${hhmm}:00+03:00`));
  const tab = (t) => p.evaluate((t) => document.querySelector(`.tab[data-tab=${t}]`).click(), t);
  const click = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  const settle = async (ms = 450) => { await p.clock.runFor(ms); await p.waitForTimeout(700); };
  // No billing on screen: hide the money card + debts bar whenever the office renders.
  const hideMoney = () => p.evaluate(() => {
    document.querySelectorAll("#office .card").forEach((c) => { const h = c.querySelector("h2"); if (h && h.textContent.includes("כסף")) c.style.display = "none"; });
    document.querySelectorAll("#office .debt-btn").forEach((b) => (b.style.display = "none"));
    document.querySelectorAll("#office .drow .muted, #office .money3").forEach((m) => { if (m.textContent.includes("₪")) m.style.visibility = "hidden"; });
    document.querySelectorAll("#driver .tiles2 .tile").forEach((t) => { if (t.textContent.includes("מזומן")) t.style.visibility = "hidden"; });
  });

  await tab("driver");
  for (let i = 0; i < 10; i++) await click('[data-lq="12"][data-n="1"]');
  for (let i = 0; i < 3; i++) await click('[data-lq="48"][data-n="1"]');
  await click("[data-load]"); await settle(100);
  await click("[data-dme=d2]"); await settle(100);
  for (let i = 0; i < 6; i++) await click('[data-lq="12"][data-n="1"]');
  await click("[data-load]"); await settle(100);

  for (const [cid, hhmm] of [["c1", "08:02"], ["c4", "08:06"], ["c3", "08:10"], ["c2", "08:12"]]) {
    await at(hhmm); await tab("customer"); await click(`[data-me=${cid}]`); await settle(100);
    await click('[data-act="order"]'); await settle(100); await click("[data-confirm]"); await settle(900);
  }
  async function deliver(did, hhmm) {
    await at(hhmm); await tab("driver"); await click(`[data-dme=${did}]`); await settle(100);
    await click("[data-way]"); await settle(100); await click('[data-mode="deliver"]'); await settle(100);
    await click("[data-deliver]"); await settle(300);
  }
  await deliver("d1", "08:25");   // Salim
  await deliver("d2", "08:40");   // Miriam
  await at("08:45"); await tab("driver"); await click("[data-dme=d1]"); await settle(100); await click("[data-way]"); await settle(); // → Nur
  await at("08:46");
  await capture({ p, tab, click, settle, hideMoney });
  await ctx.close();
}

const card = (p, h2) => p.locator("#office .card").filter({ has: p.locator("h2", { hasText: h2 }) }).first();

// Phone-size close-ups (3x)
await run({ width: 390, height: 844 }, 3, "", async ({ p, tab, click, settle, hideMoney }) => {
  await tab("driver"); await settle(); await hideMoney();
  await p.screenshot({ path: `${OUT}/r01-driver-route.png`, fullPage: true });
  await tab("office"); await settle(1200); await hideMoney();
  await card(p, "כל ההזמנות").screenshot({ path: `${OUT}/r02-orders-status.png` });
  await card(p, "נהגים").screenshot({ path: `${OUT}/r03-fleet.png` });
  await card(p, "מה קרה עכשיו").screenshot({ path: `${OUT}/r04-live-feed.png` });
  await p.locator("#office .stock-home").screenshot({ path: `${OUT}/s01-stock-home.png` });
  await click("#office .stock-home"); await settle(); await hideMoney();
  await p.locator("#office").screenshot({ path: `${OUT}/s02-stock-page.png` });
});
// The system on a laptop (2x), billing hidden
await run({ width: 1440, height: 900 }, 2, wide, async ({ p, tab, settle, hideMoney }) => {
  await tab("office"); await settle(1200); await hideMoney(); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/w01-office-laptop.png` });
});

await browser.close(); server.close();
console.log(errors.length ? "page errors: " + errors.join(" | ") : "no page errors");
