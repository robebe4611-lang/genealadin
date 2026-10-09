// Renders key stills of film.html and tiles them into a design board.
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const lang = process.argv[2] || "ar", fmt = process.argv[3] || "v";
const times = (process.argv[4] || "1.2,4.6,7.0,9.4,11.6,16.5,20.6,23.4,26.4,28.6,30.8").split(",").map(Number);
const out = `board-${lang}-${fmt}`; mkdirSync(out, { recursive: true });
const srv = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], { cwd: "..", stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const [W, H] = fmt === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("response", (r) => r.status() >= 400 && !r.url().endsWith("favicon.ico") && errs.push(r.status() + " " + r.url()));
await p.goto(`http://127.0.0.1:8765/film/film.html?lang=${lang}&fmt=${fmt}`);
await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const files = [];
for (const t of times) {
  await p.evaluate((t) => window.renderAt(t), t);
  const f = `${out}/t${String(Math.round(t * 10)).padStart(4, "0")}.jpg`;
  await p.screenshot({ path: f, type: "jpeg", quality: 90 }); files.push(f);
}
await b.close(); srv.kill();
const cols = fmt === "v" ? 6 : 4;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-pattern_type", "glob", "-i", `${out}/t*.jpg`, "-vf", `scale=${fmt === "v" ? 360 : 480}:-1,tile=${cols}x${Math.ceil(files.length / cols)}:padding=8:color=white`, "-frames:v", "1", `${out}.jpg`]);
console.log(errs.length ? "errors: " + errs.join(" | ") : "ok", out + ".jpg");
