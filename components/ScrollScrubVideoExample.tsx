"use client";

import ScrollScrubVideo, { type ScrollScrubHotspot } from "./ScrollScrubVideo";

/**
 * Example wiring for the main hall. Each additional wing (e.g. a Roman
 * blinds corridor, a roller-blind alcove) is just another
 * <ScrollScrubVideo src="..." hotspots={...} /> stacked below this one,
 * each with its own 300vh scroll track — that's what makes the component
 * reusable across the showroom rather than a one-off.
 */
const mainHallHotspots: ScrollScrubHotspot[] = [
  {
    id: "sfold-drape",
    start: 0.1,
    end: 0.28,
    style: { insetInlineStart: "6%", bottom: "12%", maxWidth: 320 },
    content: (
      <div dir="rtl" className="scrub-card">
        <h3>שילוב וילונות שכבות</h3>
        <p>S-Fold Sheer &amp; Drape · גובה 2 מטר</p>
      </div>
    ),
  },
  {
    id: "special-offer",
    start: 0.6,
    end: 0.75,
    style: { insetInlineEnd: "6%", bottom: "14%", maxWidth: 320 },
    content: (
      <div dir="rtl" className="scrub-card scrub-card--offer">
        <span className="scrub-card__flag">מבצע מיוחד</span>
        <h3>וילונות קרפ צרפתי</h3>
        <p>
          <strong>895 ₪</strong> למ״ר <s>1,190 ₪</s>
        </p>
      </div>
    ),
  },
  {
    id: "roman-blinds",
    start: 0.82,
    end: 0.96,
    style: { insetInlineStart: "6%", bottom: "12%", maxWidth: 320 },
    content: (
      <div dir="rtl" className="scrub-card">
        <h3>וילון רומאי מודרני</h3>
        <p>Modern Roman Blinds · גובה 2 מטר</p>
      </div>
    ),
  },
];

export default function ShowroomMainHall() {
  return (
    <ScrollScrubVideo
      src="/assets/video/showroom-walkthrough.mp4"
      poster="/assets/images/hall/entrance.jpg"
      hotspots={mainHallHotspots}
    />
  );
}
