// Version 2 captures: what the office owner sees on a busy morning.
// Close-ups of real cards (money, debts, stock outside, who needs gas) at 3x for sharp crops.
// Scenario: two trucks loaded; four orders; Salim pays cash, Nur takes it on debt, Miriam says she transferred,
// Ahmad's gas is on the way. The page is not modified; only the demo chrome is hidden.
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, "shots2");
mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(readFileSync(path.join(DIR, "app.html")));
}).listen(8124);

const css = `
  .top, #demo-who, .demo-note, #toasts, .col-head { display: none !important; }
  .cols { padding: 0 !important; }
  .phone { border-radius: 0 !important; box-shadow: none !important; min-height: 100vh !important; max-width: none !important; }
  #office.stack { padding: 14px 12px !important; }
`;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, timezoneId: "Asia/Jerusalem", locale: "he-IL" });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.clock.install({ time: new Date("2026-10-12T07:40:00+03:00") });
await p.goto("http://127.0.0.1:8124/");
await p.addStyleTag({ content: css });
await p.evaluate(() => document.fonts.ready);

const at = (hhmm) => p.clock.setSystemTime(new Date(`2026-10-12T${hhmm}:00+03:00`));
const tab = (t) => p.evaluate((t) => document.querySelector(`.tab[data-tab=${t}]`).click(), t);
const click = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
const settle = async (ms = 450) => { await p.clock.runFor(ms); await p.waitForTimeout(700); };
const card = (h2) => p.locator("#office .card").filter({ has: p.locator("h2", { hasText: h2 }) }).first();
const shot = async (loc, name) => { await loc.screenshot({ path: `${OUT}/${name}.png` }); };

// 07:40 — before any call: who needs gas this week (from each customer's rhythm)
await tab("office"); await settle();
await shot(card("צריכים גז השבוע"), "k01-needs-gas");

// Trucks load
await tab("driver");
for (let i = 0; i < 8; i++) await click('[data-lq="12"][data-n="1"]');
for (let i = 0; i < 2; i++) await click('[data-lq="48"][data-n="1"]');
await click("[data-load]"); await settle(100);
await click("[data-dme=d2]"); await settle(100);
for (let i = 0; i < 5; i++) await click('[data-lq="12"][data-n="1"]');
await click("[data-load]"); await settle(100);

// Four customers order from the app
async function order(cid, hhmm) {
  await at(hhmm); await tab("customer");
  await click(`[data-me=${cid}]`); await settle(100);
  await click('[data-act="order"]'); await settle(100);
  await click("[data-confirm]"); await settle(900);
}
await order("c1", "08:02"); await order("c4", "08:06"); await order("c2", "08:09"); await order("c3", "08:15");

// Deliveries: payment choice on the driver's phone
async function deliver(did, pay, hhmm) {
  await at(hhmm); await tab("driver");
  await click(`[data-dme=${did}]`); await settle(100);
  await click("[data-way]"); await settle(100);
  await click('[data-mode="deliver"]'); await settle(100);
  await click(`[data-pay=${pay}]`); await settle(100);
  await click("[data-deliver]"); await settle(300);
}
await deliver("d1", "cash", "08:31");      // Salim
await deliver("d2", "transfer", "08:44");  // Miriam
await deliver("d1", "debt", "08:52");      // Nur
await at("09:05"); await tab("driver"); await click("[data-dme=d1]"); await settle(100); await click("[data-way]"); await settle(); // Ahmad: on the way

// 09:10 — the office home
await tab("office"); await settle(1200);
await shot(card("כסף היום"), "k02-money");
await shot(p.locator("#office .stock-home"), "k03-stock-home");
await shot(card("נהגים"), "k04-drivers");
await p.screenshot({ path: `${OUT}/k05-office-home.png` });

// Debts page: debt not collected vs transfer waiting
await click("#office .debt-btn"); await settle();
await p.locator("#office").screenshot({ path: `${OUT}/k06-debts.png` });
await click("[data-back]"); await settle();

// Stock outside page
await click("#office .stock-home"); await settle();
await p.locator("#office").screenshot({ path: `${OUT}/k07-stock.png` });

await browser.close(); server.close();
console.log(errors.length ? "page errors: " + errors.join(" | ") : "no page errors");
