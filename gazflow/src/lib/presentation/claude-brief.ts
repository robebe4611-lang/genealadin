export const CLAUDE_BRIEF = `You are a 2026 spatial-design director + creative technologist.
Build a SHORT, innovative logic presentation for an Israeli home LPG cylinder delivery business.
Do NOT make a slide deck, flowchart, or SaaS dashboard. Make a spatial keynote: one 3D diorama that morphs, plus a 2D editorial HUD.

NAME
גזפלו — מכונת היום  (Gazflow · The Day Machine)

DURATION
90 seconds if film / 8 beats if interactive. No extra scenes.

FORMAT (pick what you are generating)
A. Interactive web (Three.js / R3F / Spline): keyboard + tap advances beats. RTL Hebrew HUD.
B. Motion film 16:9 or 9:16: camera flies the same 8 beats, HUD burned in.
C. Still sequence: 8 hero frames, same composition language.

ART DIRECTION — 2026, not "AI purple"
- Void #0e1419, navy #1c2a38, cream #f4ece3, ONE copper-flame accent #c45c12.
- No purple, no neon, no blob gradients, no emoji, no glassmorphism soup.
- Geometric low-poly diorama on a circular dark stage. Telephoto fov ~38. Rim light + warm key on the cylinder.
- Protagonist = a single copper gas cylinder traveling the machine. The business is the machine; the cylinder is the unit of work.
- Type: Frank Ruhl Libre (titles) + Heebo (body), Hebrew RTL. Short copy, no paragraphs on screen.

SCENE GRAPH (always present, morph by beat — do not remount)
1. Circular asphalt disc, faint engraved loop.
2. Warehouse block (left).
3. Small delivery truck (center path).
4. Three houses (right).
5. Copper cylinder (moves).
6. Five-station glowing rail (order states).
7. Three inventory silos: מחסן / רכב / רזרבה.
8. Three money pedestals: מזומן / העברה / חוב. NO credit card anywhere. If you must show a card, it is physically absent — empty socket, not a red X cartoon.
9. Message light-arc office → house.
10. Clock ring with marks at 10:00 and 20:30.

CAMERA
Directed, not free-orbit. Lerp position+lookAt per beat. Top-ish only on beat 07.

EIGHT BEATS — LOCKED HEBREW COPY (do not rewrite)

00 הלולאה
Title: יום אחד. בלון אחד.
Line: העסק לא צריך עוד אפליקציה. הוא צריך מכונה שסוגרת את היום: הזמנה, מלאי, מסלול, אספקה, הודעה, חידוש.
Chips: בלי סליקת אשראי · וואטסאפ נשאר הערוץ · אמת אחת למלאי
Camera: wide 3/4 of full diorama. Cylinder idle at warehouse.

01 שחקנים
Title: משרד, נהג, לקוח.
Line: שלושה תפקידים. המשרד רואה הכול. הנהג רואה רק את היום שלו. הלקוח רואה רק את שלו.
Highlight warehouse=office, truck=driver, house=customer.

02 הזמנה
Title: המסילה לא מדלגת.
Line: חדשה תופסת מלאי. שובצה רק עם קיבולת. סופקה רק אחרי טעינת בוקר. ביטול אחרי «בדרך» — משרד בלבד.
Cylinder rides the rail: טיוטה → חדשה → היום → נהג → בדרך → סופקה. No skipping.

03 מלאי
Title: שלושה דליים, בלי תיקון שקט.
Line: מחסן, רכב, רזרבה. אם הספירה לא מסתכמת — היום לא נסגר.
Silos fill/empty. Available = warehouse − reserve.

04 מסלול
Title: אזור, לא קסם GPS.
Line: קיבוץ לפי אזור בית. נעילה שולחת חלון ללקוח. אחרי 10:00 לא נכנסים למסלול לבד.
Truck traces neighborhood beads. Lock gesture on the path. Capacity overflow leaves stops unassigned — never auto-cram.

05 כסף
Title: נרשם. לא נסלק.
Line: מזומן אצל הנהג. העברה רק אחרי שהמשרד ראה בחשבון. חוב על הלקוח — לקריאה, בלי כפתור תשלום.
Pedestals: cash, transfer, debt. No card, no pay-now button.

06 הודעה
Title: אירוע → תבנית.
Line: לא בוט שעונה לשאלות. כל הודעה פעם אחת. כשל בשליחה לא משנה סטטוס הזמנה.
Pulses along the arc: התקבלה / חלון / בדרך / סופק. Incoming messages land in an inbox; a human decides.

07 שעון
Title: היום רץ לבד — עם בלם.
Line: לפני 10:00 נכנס להיום. תזכורת חידוש = אספקה + מחזור − 2. לקוח נרדם אחרי שני מחזורים — דגל למשרד, לא ספאם.
Camera almost top-down on the clock ring.

08 סדר
Title: קודם היום. אחר כך הפורטל.
Line: לקוח והזמנה → מלאי → מסלול ונהג → קופה → הודעות → חידוש → אזור אישי.
Pull back to the full loop. End card: חבילה B קודם · אשראי מחוץ להיקף.

2D HUD
Bottom-right in LTR mock, but THIS PRODUCT IS RTL: copy sits on the RIGHT. Kicker, huge title, one line, 3 chips, progress 00–08, next/prev. Optional 2D schematic mode: circular machine diagram of the same beats, no extra info.

LOGIC THAT MUST NOT BE VIOLATED
- No credit-card capture, tokens, or payment links.
- Cylinder is not delivered in the model unless a driver marks delivered.
- Inventory never silently reconciles.
- WhatsApp stays the customer channel; portal is optional reorder.
- Route is area-based, not fantasy UPS optimization.
- Messages are event→template, not a chatbot.

OUTPUT
Ship the interactive piece OR the 8-beat film. Keep it short. If you add anything, cut something else.
`;
