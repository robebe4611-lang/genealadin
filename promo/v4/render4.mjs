// Frame-exact render of film4.html → MP4 (−14 LUFS). Blocks if any caption is short on reading time.
// node render4.mjs <he|ar> <h|v> <main|vert15|bump6> <out.mp4>
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
const [lang, fmt, cut, out] = process.argv.slice(2);
const FPS = 30, frames = `frames-${lang}-${fmt}-${cut}`;
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames);
const port = 8772 + Math.floor(Math.random() * 100);
const srv = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: "..", stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const [W, H] = fmt === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${port}/v4/film4.html?lang=${lang}&fmt=${fmt}&cut=${cut}`);
await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const rep = await p.evaluate(() => window.timingReport);
const bad = rep.filter((r) => !r.ok);
if (bad.length) { console.table(rep); console.error("BLOCKED: caption timing", bad.map((r) => r.key)); await b.close(); srv.kill(); process.exit(2); }
const total = Math.round((await p.evaluate(() => window.DURATION)) * FPS);
for (let f = 0; f < total; f++) {
  await p.evaluate((t) => window.renderAt(t), f / FPS);
  await p.screenshot({ path: `${frames}/${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 93 });
}
await b.close(); srv.kill();
if (errs.length) { console.error("page errors:", errs); process.exit(3); }
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${frames}/%04d.jpg`, "-i", `music-${cut}.wav`,
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100",
  "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
console.log("done", out, total, "frames");
