// Key frames of film4.html as PNGs + a tiled board, and the reading-time table.
// node board.mjs <he|ar> <h|v> <cut> <t1,t2,...>
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
const [lang = "he", fmt = "h", cut = "main", ts = "7.5,11.6,18.4,23.6,28.4,37.5"] = process.argv.slice(2);
const times = ts.split(",").map(Number);
const out = `board-${lang}-${fmt}-${cut}`; rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const srv = spawn("python3", ["-m", "http.server", "8771", "--bind", "127.0.0.1"], { cwd: "..", stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const [W, H] = fmt === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errs.push(m.text()));
await p.goto(`http://127.0.0.1:8771/v4/film4.html?lang=${lang}&fmt=${fmt}&cut=${cut}`);
await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const rep = await p.evaluate(() => window.timingReport);
console.table(rep);
for (const t of times) {
  await p.evaluate((t) => window.renderAt(t), t);
  await p.screenshot({ path: `${out}/t${String(Math.round(t * 10)).padStart(4, "0")}.png` });
}
await b.close(); srv.kill();
const cols = fmt === "v" ? 6 : 3;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-pattern_type", "glob", "-i", `${out}/t*.png`, "-vf", `scale=${fmt === "v" ? 320 : 640}:-1,tile=${cols}x${Math.ceil(times.length / cols)}:padding=8:color=0x333333`, "-frames:v", "1", `${out}.jpg`]);
console.log(errs.length ? "errors: " + errs.join(" | ") : "ok", out + ".jpg");
