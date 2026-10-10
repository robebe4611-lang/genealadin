import type { CameraPose } from "@/lib/presentation/chapters";

/** One camera target inside a scene, from `at` seconds into the scene. `beat` is the World state to show. */
export type PitchShot = { at: number; beat: string; cam: CameraPose };

/** On-screen copy, from `at` seconds into the scene until the next caption. `big` = hero number/line. */
export type PitchCaption = { at: number; text: string; big?: boolean };

export type PitchScene = {
  id: string;
  kicker: string;
  duration: number;
  shots: PitchShot[];
  captions: PitchCaption[];
};

/**
 * The investor pitch as one continuous camera move through the diorama (storyboard: "גזפלו — פיץ'
 * מונפש למשקיעים"). Every figure that is not decided yet stays X on purpose.
 */
export const PITCH_SCENES: PitchScene[] = [
  {
    id: "hook",
    kicker: "01 · הכאב",
    duration: 25,
    shots: [
      { at: 0, beat: "hook", cam: { pos: [-1.2, 1.15, 2.3], look: [-2.2, 0.7, 0.85] } },
      { at: 8, beat: "hook", cam: { pos: [7.4, 5.8, 7.6], look: [0, 0.35, 0] } },
    ],
    captions: [
      { at: 1, text: "זה בלון גז." },
      { at: 8, text: "עסק שמספק X בלונים ביום." },
      { at: 14, text: "המלאי שלו חי בראש של נהג אחד." },
    ],
  },
  {
    id: "villain",
    kicker: "02 · הנבל",
    duration: 30,
    shots: [
      { at: 0, beat: "before", cam: { pos: [6.5, 4.6, 6.8], look: [0, 0.3, 0] } },
      { at: 10, beat: "before", cam: { pos: [3.6, 4.9, 8.4], look: [0, 0.3, 0] } },
      { at: 20, beat: "before", cam: { pos: [-1.5, 5.2, 8.2], look: [-0.5, 0.3, 0] } },
    ],
    captions: [
      { at: 0.5, text: "הנבל הוא לא מתחרה." },
      { at: 6, text: "שעה ביום בטלפון — ₪X" },
      { at: 12, text: "נסיעות כפולות — ₪X" },
      { at: 18, text: "לקוחות שנעלמים בשקט — ₪X" },
      { at: 24, text: "₪X בחודש", big: true },
    ],
  },
  {
    id: "hero",
    kicker: "03 · מכונת היום",
    duration: 25,
    shots: [
      { at: 0, beat: "order", cam: { pos: [0.4, 3.6, 8.2], look: [0, 0.4, 0] } },
      { at: 10, beat: "order", cam: { pos: [2.4, 2.2, 4.6], look: [1.4, 0.5, 0.4] } },
    ],
    captions: [
      { at: 0.5, text: "לולאה אחת. אמת אחת למלאי." },
      { at: 9, text: "טיוטה ← חדשה ← היום ← נהג ← בדרך ← סופקה" },
      { at: 16, text: "אם הנהג לא סימן «סופק» — זה לא סופק." },
    ],
  },
  {
    id: "refusals",
    kicker: "04 · מה שהמכונה מסרבת לעשות",
    duration: 25,
    shots: [
      { at: 0, beat: "ping", cam: { pos: [2.2, 6.2, 7.4], look: [0, 0.9, 0] } },
      { at: 12, beat: "route", cam: { pos: [8.4, 4.8, 2.8], look: [1.1, 0.25, 0] } },
      { at: 18, beat: "money", cam: { pos: [3.6, 3.2, 5.6], look: [0, 0.45, 0] } },
    ],
    captions: [
      { at: 0.5, text: "לא מחליפים את הוואטסאפ." },
      { at: 6, text: "לא בוט שעונה לשאלות." },
      { at: 12, text: "לא קסם GPS." },
      { at: 18, text: "לא סליקה בשלב הזה." },
    ],
  },
  {
    id: "market",
    kicker: "05 · השוק",
    duration: 25,
    shots: [
      { at: 0, beat: "market", cam: { pos: [6, 7, 6], look: [0, 0, 0] } },
      // Looking a little toward the viewer lifts the map clear of the caption.
      { at: 4, beat: "market", cam: { pos: [0.15, 12.5, 1.9], look: [0, 0, 1.6] } },
    ],
    captions: [
      { at: 1, text: "כ־60 ספקי גפ״מ בישראל." },
      { at: 4.5, text: "ארבעה מהם שולטים." },
      { at: 7, text: "X מפיצים עם משאית", big: true },
      { at: 15, text: "הם השוק שלנו." },
    ],
  },
  {
    id: "model",
    kicker: "06 · מודל עסקי",
    duration: 20,
    shots: [
      { at: 0, beat: "money", cam: { pos: [3.6, 3.2, 5.6], look: [0, 0.45, 0] } },
      { at: 8, beat: "money", cam: { pos: [0.3, 2.6, 7.4], look: [0, 0.5, 2.75] } },
    ],
    captions: [
      { at: 0.5, text: "הקמה ₪X · מנוי ₪X בחודש" },
      { at: 8, text: "החזר השקעה: X חודשים", big: true },
      { at: 14, text: "ומשם — הכנסה חוזרת." },
    ],
  },
  {
    id: "sauce",
    kicker: "07 · הרוטב הסודי",
    duration: 25,
    shots: [
      { at: 0, beat: "stock", cam: { pos: [0.1, 4.4, 7.2], look: [0, 1.05, 0] } },
      { at: 10, beat: "stock", cam: { pos: [0.1, 3.0, 5.0], look: [0, 1.1, 0] } },
    ],
    captions: [
      { at: 0.5, text: "17 פרקי חוזה התנהגות." },
      { at: 7, text: "ביקש 2, נשאר 1 — השלמה מחר." },
      { at: 13, text: "אין ריק בבית — נרשם על הלקוח." },
      { at: 19, text: "«סופק» בטעות — מתבטל תוך שעתיים." },
    ],
  },
  {
    id: "pilot",
    kicker: "08 · הפיילוט",
    duration: 20,
    shots: [
      { at: 0, beat: "route", cam: { pos: [8.4, 4.8, 2.8], look: [1.1, 0.25, 0] } },
      { at: 10, beat: "route", cam: { pos: [6.0, 3.2, 4.6], look: [2, 0.3, 0] } },
    ],
    captions: [
      { at: 0.5, text: "אזור אחד. נהג אחד. יום אמיתי אחד." },
      { at: 8, text: "X שבועות · 4 מדדים · לפני ואחרי" },
      { at: 14, text: "לפני X ← אחרי X", big: true },
    ],
  },
  {
    id: "ask",
    kicker: "09 · הבקשה",
    duration: 25,
    shots: [{ at: 0, beat: "build", cam: { pos: [9.2, 7.2, 9.0], look: [0, 0.2, 0] } }],
    captions: [
      { at: 3, text: "₪X", big: true },
      { at: 9, text: "מוצר עובד אצל מפיץ ראשון" },
      { at: 14, text: "מודל מנוי מוכח" },
      { at: 19, text: "X מפיצים · שוק מאומת" },
    ],
  },
  {
    id: "close",
    kicker: "10 · גזפלו",
    duration: 15,
    shots: [{ at: 0, beat: "loop", cam: { pos: [7.4, 5.8, 7.6], look: [0, 0.35, 0] } }],
    captions: [
      { at: 2, text: "יום אחד. בלון אחד.", big: true },
      { at: 8, text: "גזפלו — מכונת היום למפיצי גז" },
    ],
  },
];

/** Start time of each scene on the film's timeline, plus the total length. */
export const PITCH_STARTS = PITCH_SCENES.reduce<number[]>(
  (starts, scene, i) => [...starts, i === 0 ? 0 : starts[i - 1] + PITCH_SCENES[i - 1].duration],
  [],
);
export const PITCH_LENGTH =
  PITCH_STARTS[PITCH_STARTS.length - 1] + PITCH_SCENES[PITCH_SCENES.length - 1].duration;

/** The last item whose `at` has passed — the shot or caption showing at `local` seconds. */
export function activeAt<T extends { at: number }>(items: T[], local: number): number {
  let found = -1;
  items.forEach((item, i) => {
    if (item.at <= local) found = i;
  });
  return found;
}

/** Which scene is playing at `time` seconds into the film. */
export function sceneAt(time: number): number {
  return Math.max(
    0,
    activeAt(
      PITCH_STARTS.map((at) => ({ at })),
      time,
    ),
  );
}
