#!/usr/bin/env node
/**
 * בדיקות קצה־לקצה של מערכת ההפעלה (לקוח, נהג, משרד) בדפדפן אמיתי.
 *
 *   npm run e2e
 *
 * מרים שרת פיתוח משלו על פורט 8090 עם מסד נתונים חדש של דמו (בזיכרון), כך שכל
 * הרצה מתחילה נקייה ולא מתנגשת עם שרת פיתוח שכבר רץ. השעון ננעל על 08:30 של היום
 * בישראל (לפני שעת החיתוך), כדי שהבדיקות יתנהגו אותו דבר בכל שעה.
 * צילומי מסך נשמרים ב־e2e-results/.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8090;
const BASE = `http://127.0.0.1:${PORT}`;

const israelDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
// 05:30 UTC = 08:30 in summer, 07:30 in winter — before the 10:00 cutoff either way.
const fixedNow = `${israelDate}T05:30:00Z`;

const env = { ...process.env, OPS_FIXED_NOW: fixedNow, DATABASE_URL: "" };
const server = spawn(
  "node",
  [
    "scripts/with-app-env.mjs",
    "vite",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    String(PORT),
    "--strictPort",
  ],
  { env, stdio: ["ignore", "pipe", "pipe"], detached: true },
);
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // already gone
  }
};
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) break;
    try {
      const res = await fetch(`${BASE}/c/demo-c1`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(1000);
  }
  return false;
}

console.log(`מרים שרת בדיקה על ${BASE} (שעון בדיקה: ${fixedNow})…`);
if (!(await waitForServer())) {
  console.error("השרת לא עלה. הלוג שלו:\n" + log);
  stop();
  process.exit(1);
}

const tests = spawn("node", ["--test", "--test-concurrency=1", "e2e/ops.e2e.mjs"], {
  env: { ...process.env, E2E_BASE_URL: BASE },
  stdio: "inherit",
});
const code = await new Promise((resolve) => tests.on("exit", resolve));
stop();
process.exit(code ?? 1);
