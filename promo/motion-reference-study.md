# Motion reference study — GazFlow promo

## Source of the numbers
No reference videos were measured. Rabea had none to send, and this cloud container cannot reach any video
host (whatships.com, YouTube, X, Vimeo, apple.com, linear.app, wolt.com and monday.com all refused by the
egress proxy, 2026-10-09). The rules below are the **launch-film baseline**, measured earlier from
Instagram launch reels. When real references are available, run the measurement (15fps, 90x160 gray,
cut = diff spike >18 and >3x local median, librosa beat_track) and replace this section.

| Metric | Baseline |
|---|---|
| Median scene length | 2.2–2.5 s |
| Cut interval | 1–5 s |
| Time in motion | 40–60 % |
| Tempo | 120–136 BPM |

## Rules for this film
- **Length 32 s**, no voice-over. On-screen text only, readable with the sound off.
- **Tempo 120 BPM**: beat = 0.5 s, bar = 2 s. Every cut and every text hit lands on a beat (frame-exact at 30 fps: beats are frames 0, 15, 30…).
- **A new scene every 2–3 s** (4–6 beats). Nothing holds longer than 3 s without micro-motion.
- **Hit, then hold.** An element enters in one beat (rise or pop, ≤0.5 s), then rests. While it rests, add micro-motion (slow 2–3% device drift, the ETA ticking, the green line crawling) to keep motion at 40–60 % without extra cuts.
- **Anticipation ≈0.25 s** before every hit: the tap ring appears and squeezes (scale 1 → 0.92) one half-beat before the screen changes.
- **Pain section (0–8 s)**: music out, clock ticks on each beat and a phone ring. Desaturated base. Cuts on beats, but faster (≈1.5 s), because chaos.
- **Turn (6–8 s)**: a riser for 1 bar, then silence for half a beat, then the kick enters on the first tap.
- **One signature moment (24–27 s)**: the three screens side by side, and the green order line closes a loop through all three. This gets the only big move (scale plus glow). Everything else stays calm.
- **Text**: one line per scene, max 6 words, 72–96 px at 1080 wide. Enters with rise (translateY 60 → 0, blur 14 → 0, 0.5 s easeOutExpo). Leaves by cut, never by fade-out.
- **Colour**: neutral studio base (#F6F8F7 → #EEF2F0). Navy text #0F172A. Green #00843D only for "live / done" (tap ring, line, checkmarks). No red as the primary colour; red appears only on the debt word in the pain section.
- **Type**: IBM Plex Sans Arabic (AR) and Heebo (HE), weights 500/700/800, from local @fontsource files.
- **Honesty**: say "מתעדכן לבד / بيتحدّث لحاله", never "real-time / instant". No numbers, logos, reviews or maps that the product doesn't have. The UI inside the frames is unretouched capture.
