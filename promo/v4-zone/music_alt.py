"""Alternative scores for the zone film (zero cost, numpy only; synthesized here, so no licence questions).

python3 music_alt.py <oud|piano|house>
Same clock as music.py (120 BPM, bars on grooveStart, ticks on the two status changes, resolve at the end card),
three different colours:
  oud   — Karplus-Strong oud phrases in C Ajam (major), darbuka in maqsum (doum/tek), soft strings
  piano — felt piano arpeggios, string swell, a soft kick only from the key moment on
  house — four-on-the-floor, offbeat hats, clap, side-chained pluck chords, sub bass
Writes music-<style>-main.wav and music-<style>-<cut>.wav. Loudness is set later by ffmpeg loudnorm (−14 LUFS).
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

STYLE = sys.argv[1] if len(sys.argv) > 1 else "oud"
HERE = Path(__file__).parent
C = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
SR = 44100
DUR = float(C["duration"])
BEAT = 60 / C["bpm"]
BAR = 4 * BEAT
G0 = float(C["grooveStart"])
PAY0 = C["glow"]["flowAll"] + 0.4      # the payoff: groove steps back
END0 = C["endCard"]["dim"]             # the end card: resolve
KEY0 = C["truck"]["route"][0]["t"][0]  # the key moment starts (truck departs)
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0.0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0.0, pan))


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def lp(x, k):
    return np.convolve(x, np.ones(k) / k, "same")


def tone(f, dur, shape="sine"):
    t = np.arange(int(SR * dur)) / SR
    if shape == "saw":
        return 2 * ((f * t) % 1) - 1
    if shape == "tri":
        return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    return np.sin(2 * np.pi * f * t)


def pad(chord, dur, att=0.6, rel=0.8, bright=0.5):
    s = sum(lp(tone(note(m), dur, "saw") * 0.5 + tone(note(m) * 1.004, dur, "saw") * 0.5, 30 if bright < 0.5 else 12) for m in chord) / len(chord)
    n = len(s)
    return s * np.minimum(1, np.arange(n) / (SR * att)) * np.minimum(1, (n - np.arange(n)) / (SR * rel))


def ks(f, dur, damp=0.996, bright=0.6):
    """Karplus-Strong plucked string (oud-like when bright is low-ish and decay short)."""
    n = int(SR * dur)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    buf = lp(buf, 3) * bright + buf * (1 - bright) * 0.4
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(n, 0.001, dur * 0.6)


def piano(m, dur=2.4, vel=1.0):
    f = note(m)
    n = int(SR * dur)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, a in enumerate([1, 0.45, 0.22, 0.12, 0.06, 0.03], start=1):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)          # slight inharmonicity
        s += a * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.2 + 0.9 * k))
    hammer = lp(rng.standard_normal(n), 6) * np.exp(-t * 90) * 0.08
    return (s + hammer) * np.minimum(1, t / 0.003) * vel


def kick(soft=1.0):
    n = int(SR * 0.32)
    t = np.arange(n) / SR
    f = 46 + 95 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.12 * soft)


def hat(open_=False):
    n = int(SR * (0.12 if open_ else 0.04))
    s = rng.standard_normal(n)
    return (s - lp(s, 8)) * env(n, 0.0005, 0.04 if open_ else 0.01)


def clap():
    n = int(SR * 0.18)
    s = rng.standard_normal(n)
    s = s - lp(s, 20)
    e = np.zeros(n)
    for o in (0, 0.008, 0.016):
        i = int(o * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / 0.05)
    return s * e * 0.5


def doum():
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 95 + 40 * np.exp(-t * 25)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.14) + lp(rng.standard_normal(n), 30) * env(n, 0.001, 0.02) * 0.3


def tek():
    n = int(SR * 0.07)
    s = rng.standard_normal(n)
    s = s - lp(s, 4)
    return (s * 0.6 + tone(2300, 0.07) * 0.5) * env(n, 0.0005, 0.012)


def tick():  # the soft status tick (same as the main score)
    n = int(SR * 0.09)
    return (tone(1760, 0.09) * 0.7 + tone(2640, 0.09) * 0.3) * env(n, 0.001, 0.03)


I, IV, V, vi = [60, 64, 67], [60, 65, 69], [59, 62, 67], [57, 60, 64]
PROG = [I, V, vi, IV]
bars = []
t0 = G0
while t0 < PAY0 - 0.01:
    bars.append(t0)
    t0 += BAR

# ---------- opening + peak (shared shape, own colour) ----------
op_notes = [72, 74, 76, 79]
if STYLE == "oud":
    add(pad(I, C["peak"]["in"] + 0.8, att=1.5), 0, 0.07)
    for o, m in zip(C["opening"], op_notes):
        add(ks(note(m - 12), 1.6, 0.997), o["in"], 0.5, pan=0.15)
    add(pad([60, 64, 67, 72], G0 - C["peak"]["in"] + 0.8, att=0.4), C["peak"]["in"], 0.11)
    for k, m in enumerate([67, 72, 76]):
        add(ks(note(m - 12), 2.0, 0.998), C["peak"]["in"] + k * 0.08, 0.45)
elif STYLE == "piano":
    for o, m in zip(C["opening"], op_notes):
        add(piano(m - 12, 2.6, 0.9), o["in"], 0.32, pan=0.1)
        add(piano(48, 2.6, 0.6), o["in"], 0.18)
    add(pad([60, 64, 67, 72], G0 - C["peak"]["in"] + 1.0, att=0.8), C["peak"]["in"], 0.10)
    for k, m in enumerate([60, 64, 67, 72, 76]):
        add(piano(m, 3.0, 0.8), C["peak"]["in"] + k * 0.09, 0.22)
else:
    add(pad(I, C["peak"]["in"] + 0.8, att=1.5, bright=0.8), 0, 0.06)
    for o, m in zip(C["opening"], op_notes):
        s = tone(note(m), 0.5, "saw")
        add(lp(s, 6) * env(len(s), 0.002, 0.18), o["in"], 0.18, pan=0.2)
    sw = np.linspace(0, 1, int(SR * (C["peak"]["in"] - 4.4)))
    add(lp(rng.standard_normal(len(sw)), 14) * sw ** 2 * 0.25, 4.4, 0.5)          # a soft riser into the peak
    add(kick(1.4), C["peak"]["in"], 0.6)
    add(pad([60, 64, 67, 72], G0 - C["peak"]["in"] + 0.6, att=0.2, bright=0.8), C["peak"]["in"], 0.10)

# ---------- groove ----------
for b, tb in enumerate(bars):
    ch = PROG[b % 4]
    root = ch[0] - 24
    if STYLE == "oud":
        add(pad(ch, BAR, att=0.3, rel=0.3), tb, 0.06)
        for o, f in ((0, doum), (0.5, tek), (1.5, tek), (2.0, doum), (3.0, tek)):   # maqsum on eighths of a 4-beat bar
            add(f(), tb + o * BEAT, 0.5 if f is doum else 0.22, pan=-0.1 if f is tek else 0)
        for s in range(8):
            add(hat() * 0.5, tb + s * BEAT / 2, 0.05, pan=0.35)
        bass = tone(note(root), BAR * 0.9) * env(int(SR * BAR * 0.9), 0.01, 0.6)
        add(bass, tb, 0.22)
        # an oud phrase every bar: chord tones walking up, a turn on the last beat
        phrase = [ch[0], ch[1], ch[2], ch[1] + 12 if ch[1] < 64 else ch[1], ch[2], ch[1], ch[0] + 12, ch[2]]
        for s, m in enumerate(phrase):
            if (b % 2 == 1 and s in (6, 7)) or (s == 3 and b % 4 == 3):
                continue
            add(ks(note(m - 12), 0.6, 0.994), tb + s * BEAT / 2, 0.42, pan=0.2)
    elif STYLE == "piano":
        add(pad(ch, BAR, att=0.6, rel=0.6), tb, 0.07 + (0.03 if tb >= KEY0 else 0))
        arp = [ch[0] - 12, ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[0]]
        for s, m in enumerate(arp):
            add(piano(m, 1.6, 0.75 if s % 2 else 0.95), tb + s * BEAT / 2, 0.17, pan=0.15 if s % 2 else -0.15)
        add(piano(root, BAR, 0.8), tb, 0.2)
        if tb >= KEY0:
            for k in (0, 2):
                add(kick(0.9), tb + k * BEAT, 0.42)
            add(hat(), tb + 1.5 * BEAT, 0.06); add(hat(), tb + 3.5 * BEAT, 0.06)
    else:
        for k in range(4):
            add(kick(), tb + k * BEAT, 0.6)
            add(hat(True), tb + k * BEAT + BEAT / 2, 0.09, pan=-0.25)
        add(clap(), tb + BEAT, 0.28); add(clap(), tb + 3 * BEAT, 0.28)
        # side-chained pluck chords on the offbeats
        for s in range(8):
            for m in ch:
                p_ = lp(tone(note(m), 0.24, "saw") + tone(note(m) * 1.005, 0.24, "saw"), 5) * env(int(SR * 0.24), 0.002, 0.09)
                add(p_, tb + s * BEAT / 2 + 0.01, 0.07 if s % 2 else 0.04, pan=0.2 if s % 2 else -0.2)
        sub = tone(note(root), BAR)
        duck = np.ones(len(sub))
        for k in range(4):
            i = int(k * BEAT * SR)
            j = min(len(sub), i + int(0.18 * SR))
            duck[i:j] = np.linspace(0.15, 1, j - i)
        add(sub * duck * env(len(sub), 0.01, 3.0), tb, 0.3)

# the only sound effects: a soft tick as the button above the truck changes
add(tick(), C["status"]["toOnTheWay"], 0.32)
add(tick(), C["status"]["toDelivered"], 0.32)

# ---------- payoff (everything flows): groove steps back, a warm lift ----------
pay_len = END0 - PAY0 + 0.6
if STYLE == "oud":
    add(pad(IV, pay_len, att=0.6), PAY0, 0.11)
    for k, m in enumerate([65, 69, 72, 77, 72, 69]):
        add(ks(note(m - 12), 1.2, 0.997), PAY0 + 0.3 + k * 0.5, 0.36, pan=0.2)
    for k in range(int(pay_len / BAR)):
        add(doum(), PAY0 + k * BAR, 0.3)
elif STYLE == "piano":
    add(pad(IV, pay_len, att=0.8), PAY0, 0.12)
    for k, m in enumerate([65, 69, 72, 77]):
        add(piano(m, 3.0, 0.8), PAY0 + 0.3 + k * BEAT, 0.2)
else:
    add(pad(IV, pay_len, att=0.4, bright=0.8), PAY0, 0.11)
    for k in range(int(pay_len / BEAT)):
        add(hat(True), PAY0 + k * BEAT + BEAT / 2, 0.05)

# ---------- end card: resolve on I, a note when the logo lands ----------
add(pad([60, 64, 67, 72], DUR - END0, att=0.6, rel=1.6), END0, 0.12)
if STYLE == "oud":
    add(ks(note(67 - 12), 2.4, 0.998), C["endCard"]["lineIn"], 0.45)
    for k, m in enumerate([60, 64, 67, 72]):
        add(ks(note(m - 12), 3.0, 0.999), C["endCard"]["logoIn"] + k * 0.07, 0.4)
    add(doum(), C["endCard"]["logoIn"], 0.4)
elif STYLE == "piano":
    add(piano(67, 3.0), C["endCard"]["lineIn"], 0.22)
    for k, m in enumerate([48, 60, 64, 67, 72]):
        add(piano(m, 4.0, 0.85), C["endCard"]["logoIn"] + k * 0.06, 0.2)
else:
    add(kick(1.4), C["endCard"]["logoIn"], 0.55)
    for m in [72, 76, 79]:
        s = tone(note(m), 2.0, "saw")
        add(lp(s, 8) * env(len(s), 0.004, 0.6), C["endCard"]["logoIn"], 0.08)

mix = np.stack([L, R], axis=1)
fs = int(SR * 1.5)
mix[-fs:] *= np.linspace(1, 0, fs)[:, None]
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.8


def write(path, data):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(data, -1, 1) * 32767).astype("<i2").tobytes())


write(HERE / f"music-{STYLE}-main.wav", mix)
xf = int(SR * 0.35)
for name, cut in C["cuts"].items():
    if name == "main":
        continue
    out = None
    for a, b in cut["segments"]:
        sl = mix[int(a * SR):int(b * SR)].copy()
        if out is None:
            out = sl
        else:
            ramp = np.linspace(0, 1, xf)[:, None]
            out = np.concatenate([out[:-xf], out[-xf:] * (1 - ramp) + sl[:xf] * ramp, sl[xf:]])
    total = int(cut["duration"] * SR)
    out = out[:total] if len(out) >= total else np.concatenate([out, np.zeros((total - len(out), 2))])
    f = int(SR * 0.8)
    out[-f:] *= np.linspace(1, 0, f)[:, None]
    write(HERE / f"music-{STYLE}-{name}.wav", out)
print("wrote", STYLE)
