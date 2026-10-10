#!/usr/bin/env node
/**
 * Render the /pitch film to numbered JPEG frames, frame-exact (the page's clock is stopped and
 * stepped from here, so the video is smooth however slowly the machine renders WebGL).
 *
 *   npm run dev   # in another terminal
 *   node scripts/capture-pitch.mjs <outDir> [fps=24] [from=0] [to=end] [width=1920] [height=1080]
 *   ffmpeg -framerate 24 -i <outDir>/f%05d.jpg -c:v libx264 -pix_fmt yuv420p pitch.mp4
 *
 * CHROMIUM_PATH overrides the browser (Claude cloud sessions: /opt/pw-browsers/chromium).
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const [out, fpsArg = "24", fromArg = "0", toArg, wArg = "1920", hArg = "1080"] =
  process.argv.slice(2);
if (!out) {
  console.error(
    "usage: node scripts/capture-pitch.mjs <outDir> [fps] [from] [to] [width] [height]",
  );
  process.exit(2);
}
const fps = Number(fpsArg);
const from = Number(fromArg);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: Number(wArg), height: Number(hArg) } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.PITCH_URL || "http://127.0.0.1:8080/pitch?record", {
  waitUntil: "networkidle",
});
await page.waitForFunction(() => window.__pitch && document.querySelector("canvas"));
await page.waitForTimeout(1500);

const length = await page.evaluate(() => window.__pitch.length);
const to = toArg === undefined ? length : Math.min(Number(toArg), length);
await page.evaluate(async (start) => {
  while (window.__pitch.time() < start - 1e-6) {
    await window.__pitch.step(Math.min(0.1, start - window.__pitch.time()));
  }
}, from);

const total = Math.round((to - from) * fps);
for (let i = 0; i < total; i++) {
  await page.evaluate(async (dt) => {
    await window.__pitch.step(dt);
    // CSS animations (the kinetic captions) follow the film clock, not the wall clock.
    const t = window.__pitch.time();
    window.__animStart ??= new WeakMap();
    for (const a of document.getAnimations()) {
      if (!window.__animStart.has(a)) window.__animStart.set(a, t);
      a.pause();
      a.currentTime = (t - window.__animStart.get(a)) * 1000;
    }
  }, 1 / fps);
  await page.screenshot({
    path: join(out, `f${String(i).padStart(5, "0")}.jpg`),
    type: "jpeg",
    quality: 90,
  });
  if (i % (fps * 10) === 0) console.log(`frame ${i}/${total}`);
}
console.log(`done: ${total} frames${errors.length ? `; page errors: ${errors.join(" | ")}` : ""}`);
await browser.close();
