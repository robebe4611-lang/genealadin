"""launch-film measurement: cuts, scene lengths, % in motion, cuts on beats.

python3 measure.py video.mp4
Frames at 15 fps, 90x160 gray (ffmpeg rawvideo), mean abs diff per frame.
Cut = diff spike above 18 and above 3x the local median. Motion = diff above 1.5.
Beats: librosa beat_track on f32le audio decoded by ffmpeg.
"""
import subprocess
import sys

import numpy as np

path = sys.argv[1]
W, H, FPS = 90, 160, 15
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"fps={FPS},scale={W}:{H},format=gray",
                      "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
cuts = []
for i, d in enumerate(diff):
    lo, hi = max(0, i - 7), min(len(diff), i + 8)
    med = np.median(diff[lo:hi])
    if d > 18 and d > 3 * max(med, 0.5):
        cuts.append((i + 1) / FPS)
dur = len(fr) / FPS
bounds = [0.0] + cuts + [dur]
scenes = np.diff(bounds)
moving = float((diff > 1.5).mean() * 100)

beats_hit = "n/a"
tempo = "n/a"
try:
    import librosa
    sr = 22050
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    y = np.frombuffer(pcm, np.float32)
    if len(y):
        tmp, beats = librosa.beat.beat_track(y=y, sr=sr)
        bt = librosa.frames_to_time(beats, sr=sr)
        tempo = f"{float(np.atleast_1d(tmp)[0]):.0f} BPM"
        if cuts:
            on = sum(1 for c in cuts if np.min(np.abs(bt - c)) <= 0.12)
            beats_hit = f"{on}/{len(cuts)}"
except Exception as e:  # noqa: BLE001
    beats_hit = f"librosa failed: {e}"

print(f"file            {path}")
print(f"duration        {dur:.1f} s")
print(f"cuts            {len(cuts)}  at {', '.join(f'{c:.1f}' for c in cuts)}")
print(f"scene length    median {np.median(scenes):.2f} s · min {scenes.min():.2f} · max {scenes.max():.2f}")
print(f"in motion       {moving:.0f} % of frames")
print(f"tempo           {tempo}")
print(f"cuts on beats   {beats_hit} (within 0.12 s)")
