"""Score for GazFlow v4 (zero cost, numpy only; synthesized here, so no licence questions).

Reads promo/v4/config.json. Major key, 120 BPM. The opening is a soft pad with one gentle pluck per line;
the groove starts with the line (grooveStart) so bars fall on it; one soft tick when the status pill
changes (on downbeats); no whooshes. The breath drops to pad; the ending resolves; 1.5 s fade-out.
Writes the 40 s master, then each cut by joining master slices with 0.35 s crossfades.
Loudness is set later by ffmpeg loudnorm to −14 LUFS.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
C = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
SR = 44100
DUR = float(C["duration"])
BEAT = 60 / C["bpm"]
G0 = float(C["grooveStart"])
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(11)


def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0.0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0.0, pan))


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def tone(f, dur, shape="sine"):
    t = np.arange(int(SR * dur)) / SR
    if shape == "tri":
        return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    if shape == "saw":
        return 2 * ((f * t) % 1) - 1
    return np.sin(2 * np.pi * f * t)


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pad(chord, dur, att=0.6, rel=0.6):
    s = sum(tone(note(m), dur, "tri") * 0.6 + tone(note(m) * 1.003, dur, "tri") * 0.4 for m in chord) / len(chord)
    n = len(s)
    e = np.minimum(1, np.arange(n) / (SR * att)) * np.minimum(1, (n - np.arange(n)) / (SR * rel))
    return s * e


def pluck(m, dur=1.6):
    n = int(SR * dur)
    return (tone(note(m), dur) + 0.35 * tone(note(m) * 2, dur) + 0.12 * tone(note(m) * 3, dur)) * env(n, 0.004, 0.45)


def kick():
    n = int(SR * 0.3)
    t = np.arange(n) / SR
    f = 48 + 90 * np.exp(-t * 32)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.11)


def hat():
    n = int(SR * 0.04)
    s = rng.standard_normal(n)
    return (s - np.convolve(s, np.ones(8) / 8, "same")) * env(n, 0.0005, 0.01)


def tick():  # the soft status tick
    n = int(SR * 0.09)
    return (tone(1760, 0.09) * 0.7 + tone(2640, 0.09) * 0.3) * env(n, 0.001, 0.03)


I, IV, V, vi = [60, 64, 67], [60, 65, 69], [59, 62, 67], [57, 60, 64]

# opening 0 → grooveStart: pad + one pluck per line, a lift on the peak
add(pad(I, C["peak"]["in"] + 0.6, att=1.2), 0.0, 0.10)
for o, m in zip(C["opening"], [72, 74, 76, 79]):
    add(pluck(m), o["in"], 0.22, pan=0.15)
add(pad([60, 64, 67, 72], G0 - C["peak"]["in"] + 0.6, att=0.4), C["peak"]["in"], 0.13)
add(pluck(84, 2.4), C["peak"]["in"], 0.26)

# the customer's tap: one bright pluck on the downbeat
add(pluck(79, 1.2), C["events"]["tap"], 0.2, pan=-0.1)

# groove from the line's birth to the breath; bars on G0, G0+2, …
breath0, end0 = C["breath"][0], C["endCard"]["lineIn"]
prog = [I, V, vi, IV]
bar = 0
t0 = G0
while t0 < breath0 - 0.01:
    ch = prog[bar % 4]
    add(pad(ch, 2.0, att=0.15, rel=0.2), t0, 0.08)
    root = ch[0] - 24
    for s in range(8):
        bn = tone(note(root), 0.24, "saw")
        bn = np.convolve(bn, np.ones(40) / 40, "same") * env(len(bn), 0.004, 0.12)
        add(bn, t0 + s * 0.25, 0.10)
    for b in range(4):
        add(kick(), t0 + b * BEAT, 0.55)
        add(hat(), t0 + b * BEAT + BEAT / 2, 0.10, pan=-0.3)
    bar += 1
    t0 += 2.0

# the only sound effect: a soft tick as the order is assigned and as the status pill changes
add(tick(), C["events"]["assigned"], 0.28)
add(tick(), C["status"]["toOnTheWay"], 0.32)
add(tick(), C["status"]["toDelivered"], 0.32)

# breath: pad only; ending: resolve on I, a pluck when the logo lands
add(pad(IV, end0 - breath0 + 0.4, att=0.5), breath0, 0.12)
add(pad([60, 64, 67, 72], DUR - end0, att=0.5, rel=1.4), end0, 0.13)
add(pluck(79, 2.0), C["line"]["waypoints"]["end"], 0.2)
add(pluck(84, 2.4), C["endCard"]["logoIn"], 0.22)

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


write(HERE / "music-main.wav", mix)
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
            head = out[-xf:] * (1 - ramp) + sl[:xf] * ramp
            out = np.concatenate([out[:-xf], head, sl[xf:]])
    total = int(cut["duration"] * SR)
    out = out[:total] if len(out) >= total else np.concatenate([out, np.zeros((total - len(out), 2))])
    f = int(SR * 0.8)
    out[-f:] *= np.linspace(1, 0, f)[:, None]
    write(HERE / f"music-{name}.wav", out)
print("wrote", ", ".join(sorted(p.name for p in HERE.glob("music-*.wav"))))
