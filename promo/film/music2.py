"""Synthesized score for GazFlow promo v2 (the owner's morning). Zero cost, numpy only.

120 BPM, 32 s, follows the film timeline:
 0–6   pain: no music, clock tick on every beat, phone ring bursts (same rhythm as the shaking phone)
 6–8   turn: riser, then half a beat of silence
 8–29  groove: kick / clap / hats / saw bass / soft pad, chimes on every real UI confirmation
 24    impact for the signature moment, three rising chimes as the screens light up
 29–32 end card: pad chord, last chime on the checkmark, fade out
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 32.0
BEAT = 0.5
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


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


def tone(freq, dur, shape="sine"):
    t = np.arange(int(SR * dur)) / SR
    ph = 2 * np.pi * freq * t
    if shape == "saw":
        return 2 * ((freq * t) % 1) - 1
    if shape == "tri":
        return 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    return np.sin(ph)


def kick():
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.12)


def clap():
    n = int(SR * 0.18)
    s = rng.standard_normal(n)
    s = np.convolve(s, np.ones(6) / 6, "same") - np.convolve(s, np.ones(40) / 40, "same")
    return s * env(n, 0.001, 0.05)


def hat():
    n = int(SR * 0.05)
    s = rng.standard_normal(n)
    s = s - np.convolve(s, np.ones(8) / 8, "same")
    return s * env(n, 0.0005, 0.012)


def tick():
    n = int(SR * 0.03)
    return (tone(2600, 0.03) * 0.6 + rng.standard_normal(n) * 0.4) * env(n, 0.0005, 0.006)


def chime(f):
    n = int(SR * 1.2)
    s = tone(f, 1.2) + 0.4 * tone(f * 2, 1.2) + 0.15 * tone(f * 3, 1.2)
    return s * env(n, 0.003, 0.35)


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---- pain: ticks + ring (ring bursts while (t % 1.5) < 0.9, t < 6)
for b in range(11):
    add(tick(), b * BEAT, 0.35, pan=0.2)
for k in range(4):
    t0 = k * 1.5
    if t0 >= 5.5:
        break
    d = 0.9
    t = np.arange(int(SR * d)) / SR
    ring = (np.sin(2 * np.pi * 425 * t) + np.sin(2 * np.pi * 480 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 20 * t)))
    add(ring * env(len(t), 0.005, 0.6) * 0.5, t0, 0.18, pan=-0.2)

# ---- turn: riser 6.0 → 7.75, then silence
rd = 1.25
t = np.arange(int(SR * rd)) / SR
f = 180 * (4.5 ** (t / rd))
riser = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + rng.standard_normal(len(t)) * 0.25 * (t / rd)
riser *= (t / rd) ** 2
add(riser, 5.5, 0.35)

# ---- groove 8 → 29
# progression per 2-s bar: C – G – Am – F (bright, steady)
prog = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
for bar in range(11):
    t0 = 7 + bar * 2
    if t0 >= 27.5:
        break
    root, chord = prog[bar % 4]
    pad = sum(tone(note(m), 2.0, "tri") for m in chord) / 3
    pad *= np.minimum(1, np.arange(len(pad)) / (SR * 0.3)) * np.minimum(1, (len(pad) - np.arange(len(pad))) / (SR * 0.2))
    add(pad, t0, 0.07)
    for s in range(8):  # eighth-note bass
        bn = tone(note(root), 0.24, "saw")
        bn = np.convolve(bn, np.ones(30) / 30, "same") * env(len(bn), 0.003, 0.12)
        add(bn, t0 + s * 0.25, 0.16)
for b in range(int((27.5 - 7) / BEAT)):
    t0 = 7 + b * BEAT
    add(kick(), t0, 0.9)
    if b % 2 == 1:
        add(clap(), t0, 0.35, pan=0.1)
    add(hat(), t0 + 0.25, 0.18, pan=-0.3)

# chimes on real UI confirmations (C major pentatonic)
for t0, m in [(7.0, 72), (9.0, 74), (11.0, 76), (13.0, 79), (16.0, 76), (17.5, 79), (20.0, 81), (21.0, 84)]:
    add(chime(note(m)), t0, 0.22)

# signature: impact + three rising chimes as the screens light up
n = int(SR * 1.5)
tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-tt * 8)) / SR) * env(n, 0.002, 0.5)
add(boom + rng.standard_normal(n) * env(n, 0.001, 0.08) * 0.3, 23.0, 0.8)
for i, m in enumerate([76, 79, 84]):
    add(chime(note(m)), 24.0 + 0.25 * i, 0.25, pan=0.4 - 0.4 * i)
for i, t0 in enumerate([25.5, 26.5]):  # the pair
    add(chime(note(72 + 2 * i)), t0, 0.12)

# ---- end card
pad = sum(tone(note(m), 3.0, "tri") for m in [60, 64, 67, 72]) / 4
pad = sum(tone(note(m), 4.5, "tri") for m in [60, 64, 67, 72]) / 4
add(pad * np.minimum(1, np.arange(len(pad)) / (SR * 0.05)), 27.5, 0.12)
add(kick(), 27.5, 0.8)
add(chime(note(84)), 27.75, 0.3)
add(chime(note(88)), 29.0, 0.28)  # the call to action

# master: soft clip, 1.5 s fade-out, normalize
mix = np.stack([L, R], axis=1)
fade = np.ones(N)
fs = int(SR * 1.5)
fade[-fs:] = np.linspace(1, 0, fs)
mix *= fade[:, None]
mix = np.tanh(mix * 1.2)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89
out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out)
