"""QA for a v4 render (work sheet, step 5): frames every 0.5 s → contact sheet at 640 px wide,
integrated loudness (ebur128), forbidden words in every on-screen text."""
import json, re, subprocess, sys
from pathlib import Path
mp4 = sys.argv[1]
here = Path(__file__).parent
name = Path(mp4).stem
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-vf", "fps=2,scale=640:-1,tile=8x10:padding=4:color=0x222222", "-frames:v", "1", f"qa-{name}.jpg"], check=True)
r = subprocess.run(["ffmpeg", "-nostats", "-i", mp4, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
I = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
print(f"loudness  {I[-1] if I else '?'} LUFS integrated (target −14)")
d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout)
print(f"duration  {d:.2f} s")
C = json.loads((here / "config.json").read_text(encoding="utf-8"))
banned = ["שעות", "חוסך", "כאוס", "בלגן", "נמאס", "ساعات", "فوضى"]
hits = []
for lang, tx in C["text"].items():
    for k, v in tx.items():
        if k.startswith("_") or not isinstance(v, str): continue
        for w in banned:
            if w in v: hits.append((lang, k, w))
print("banned    " + ("none" if not hits else str(hits)))
print("sheet     " + f"qa-{name}.jpg")
