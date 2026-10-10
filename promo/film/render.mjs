// Frame-exact render of film.html: renderAt(f/30) → JPEG → MP4 with music.wav.
// node render.mjs <ar|he> <v|h>
import { chromium } from "/home/user/genealadin/gazflow/node_modules/playwright/index.mjs";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

const lang = process.argv[2] || "ar", fmt = process.argv[3] || "v";
const FPS = 30;
const frames = `frames${process.env.FILM ? "-" + process.env.FILM : ""}-${lang}-${fmt}`;
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames);
const srv = spawn("python3", ["-m", "http.server", "8766", "--bind", "127.0.0.1"], { cwd: "..", stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const [W, H] = fmt === "v" ? [1080, 1920] : [1920, 1080];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(`http://127.0.0.1:8766/film/${process.env.FILM || "film"}.html?lang=${lang}&fmt=${fmt}`);
await p.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const total = Math.round((await p.evaluate(() => window.DURATION)) * FPS);
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await p.evaluate((t) => window.renderAt(t), f / FPS);
  await p.screenshot({ path: `${frames}/${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 93 });
  if (f % 150 === 0) console.log(`frame ${f}/${total} · ${Math.round((Date.now() - t0) / 1000)}s`);
}
await b.close(); srv.kill();
const out = `gazflow${process.env.FILM === "film2" ? "-v2" : ""}-${lang}-${fmt === "v" ? "9x16" : "16x9"}.mp4`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${frames}/%04d.jpg`, "-i", process.env.MUSIC || "music.wav",
  "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
console.log("done", out);
