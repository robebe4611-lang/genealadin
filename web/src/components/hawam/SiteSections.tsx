import { useState, type FormEvent } from "react";

import customCurtainsImage from "@/assets/custom-curtains.jpeg";
import romanCurtainImage from "@/assets/roman-curtain.jpeg";
import sheerLivingRoomImage from "@/assets/sheer-living-room.jpeg";
import softRomanImage from "@/assets/soft-roman.jpeg";

/* Real business content, ported from the client's live site at
   hawamdesign.com (a separate, already-functional Next-ish build) per
   request — phone number, pricing offer, services, about copy, gallery
   captions, all 8 testimonials, process steps and service areas are
   copied verbatim from there, not invented. Visual treatment is our own
   (serif headings, off-white/gold/taupe palette, no bright WhatsApp-green
   badges) to match the rest of this page rather than the source site's
   look. */

const WHATSAPP_NUMBER = "972506541828";
const PHONE_DISPLAY = "050-654-1828";
const PHONE_TEL = "+972506541828";

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const DEFAULT_WA_TEXT = "היי, אשמח לקבל פרטים על וילונות בהתאמה אישית";

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function SiteTopBar() {
  return (
    <header className="site-topbar">
      <a className="site-brand" href="#top">
        <span className="site-brand-mark">HD</span>
        <span>
          <strong>חוואם דיזיין</strong>
          <small>וילונות בהתאמה אישית</small>
        </span>
      </a>
      <a className="site-topbar-phone" href={`tel:${PHONE_TEL}`}>
        <PhoneIcon /> {PHONE_DISPLAY}
      </a>
    </header>
  );
}

export function OfferSection() {
  return (
    <section className="offer-wrap" aria-labelledby="offer-title">
      <div className="offer-card">
        <div className="offer-copy">
          <span className="offer-badge">מבצע מיוחד</span>
          <h2 id="offer-title">וילון קרפ צרפתי לקיר ברוחב 3 מטר</h2>
          <div className="offer-included">
            <span><CheckIcon /> מדידה</span>
            <span><CheckIcon /> תפירה</span>
            <span><CheckIcon /> התקנה</span>
          </div>
          <p className="offer-note">עד גובה 2.90 מטר · למידות אחרות נשמח לתת הצעת מחיר</p>
        </div>
        <div className="offer-price">
          <span>הכול כלול</span>
          <strong><small>₪</small>895</strong>
          <a href={waLink("היי, אשמח לפרטים על המבצע – וילון קרפ צרפתי 3 מטר")} target="_blank" rel="noreferrer">
            אני רוצה פרטים
          </a>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  "וילונות בד בהתאמה אישית",
  "וילונות רומאיים ורומאיים רכים",
  "וילונות גלילה וונציאניים",
  "מבחר סוגי תפירה ובדים",
];

export function ServicesSection() {
  return (
    <section className="section" aria-labelledby="services-title">
      <div className="section-heading">
        <span>עיצוב שמתחיל בהקשבה</span>
        <h2 id="services-title">כל חלון מקבל פתרון משלו</h2>
        <p>מתאימים את הבד, סוג התפירה והפתרון הנכון לחלל, לאור ולסגנון שלכם.</p>
      </div>
      <div className="service-grid">
        {SERVICES.map((name, index) => (
          <article className="service-card" key={name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{name}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="about" aria-labelledby="about-title">
      <div className="about-number">
        <strong>50</strong>
        <span>שנות ניסיון<br />ומסורת</span>
      </div>
      <div className="about-copy">
        <span>הסיפור שלנו</span>
        <h2 id="about-title">גדלנו אל תוך עולם הווילונות</h2>
        <p>
          כבר קרוב ל־50 שנה אנחנו חיים ונושמים בדים, תפירה ועיצוב. את המלאכה
          הכרנו עוד מהילדות, ומאז הפכנו את האהבה לדיוק, לאסתטיקה ולעבודת יד
          למקצוע שעובר איתנו מדור לדור.
        </p>
        <p>
          עבורנו וילון הוא לא רק בד — הוא האור, האווירה והגימור שמחברים את כל
          הבית. לכן אנחנו מלווים כל לקוח באופן אישי, מהרעיון והמדידה ועד
          לתפירה ולהתקנה המושלמת.
        </p>
      </div>
    </section>
  );
}

const GALLERY_SECONDARY = [
  { src: sheerLivingRoomImage, alt: "וילון בד שקוף לאורך חלונות הסלון" },
  { src: romanCurtainImage, alt: "וילון רומאי לבן" },
  { src: softRomanImage, alt: "וילון רומאי רך במטבח" },
];

export function GallerySection() {
  return (
    <section className="section gallery-section" aria-labelledby="gallery-title">
      <div className="section-heading inline-heading">
        <div>
          <span>עבודות שלנו</span>
          <h2 id="gallery-title">הפרטים שעושים את החדר</h2>
        </div>
        <p>מדידה מדויקת, נפילה נכונה וגימור נקי.</p>
      </div>
      <div className="gallery">
        <img
          className="gallery-main"
          src={customCurtainsImage}
          alt="וילונות בד לבנים בהתאמה אישית בסלון"
        />
        {GALLERY_SECONDARY.map((image) => (
          <img key={image.src} src={image.src} alt={image.alt} />
        ))}
      </div>
    </section>
  );
}

type Testimonial = { quote: string; name: string; city?: string };

const TESTIMONIALS: Testimonial[] = [
  { quote: "תודה רבה עבודה מאוד מקצועית ובד אכותי תודה ענקית לחואם דיזיין", name: "רנין חוואם", city: "שפרעם" },
  { quote: "ממליץ בחום תודה לכם", name: "ויסאם חואם", city: "שפרעם" },
  { quote: "לפני כל המקצועיות זכיתי להכיר אישיות מדהימה עם לב ענק — סבלני, אכפתי ומקצועי ברמה אחת מעל כולם. אין לתאר את היופי שהוספת לנו לבית.", name: "לקוחה מרוצה" },
  { quote: "עשה עבודה ממש מקצועית ובלי פשלות. היה מהיר, מצא פתרונות ולגמרי היה פייר.", name: "סאם", city: "חיפה" },
  { quote: "ויסאם היה מצוין! נתן שירות מצוין ועשה עבודה מצוינת. הכול עשר!", name: "חיים", city: "טירת כרמל" },
  { quote: "אין מילים — עבודה מושלמת. אדם שירותי ומקצועי, עשית מהפך במראה הבית. עבודה מסורה ונקייה.", name: "תמר" },
  { quote: "הוא התאמץ להגיע, עמד בזמנים והגיע למדידות בדיוק בזמן שקבענו. באמת מרוצה מאוד!", name: "ברק", city: "עכו" },
  { quote: "כשמקצועיות ויופי נפגשים! תודה רבה על עבודה מושלמת, אדיבות, שירות מהיר ותוצאה מהממת.", name: "ליאת" },
];

function Stars() {
  return (
    <div className="stars" aria-label="5 מתוך 5 כוכבים">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="section-heading">
        <span>לקוחות מספרים</span>
        <h2 id="testimonials-title">האמון שלהם הוא הגאווה שלנו</h2>
        <p>המלצות אמיתיות מלקוחות שבחרו בחוואם דיזיין לבית שלהם.</p>
      </div>
      <div className="testimonial-grid">
        {TESTIMONIALS.map((t) => (
          <article className="testimonial-card" key={`${t.name}-${t.city ?? ""}`}>
            <Stars />
            <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
            <footer>
              <strong>{t.name}</strong>
              {t.city && <span>{t.city}</span>}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

const PROCESS_STEPS = [
  { title: "מדברים ומבינים", body: "מספרים לנו מה אתם מחפשים ושולחים תמונה של החלל." },
  { title: "מודדים ומתאימים", body: "מגיעים למדידה ומתאימים בד, צבע וסוג תפירה." },
  { title: "תופרים ומתקינים", body: "מכינים לפי המידה ומסיימים בהתקנה מקצועית." },
];

export function ProcessSection() {
  return (
    <section className="process">
      <div className="section-heading">
        <span>פשוט ונוח</span>
        <h2>כך הופכים רעיון לווילון מושלם</h2>
      </div>
      <div className="steps">
        {PROCESS_STEPS.map((step, index) => (
          <div key={step.title}>
            <b>{index + 1}</b>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AreasSection() {
  return (
    <section className="areas">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <div>
        <h2>מגיעים עד אליכם</h2>
        <p>חיפה והכרמל · הקריות · עכו · נהריה · נצרת ונוף הגליל · עפולה והסביבה</p>
      </div>
    </section>
  );
}

/* No backend to post the lead form to, so submitting builds a WhatsApp
   message from the three fields and opens it there instead — still a
   real, working path to a real conversation, not a form that silently
   goes nowhere. */
export function LeadFormSection() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const message = `היי, אשמח לקבל פרטים על וילונות בהתאמה אישית.\nשם: ${name}\nטלפון: ${phone}\nעיר: ${city}`;
    window.open(waLink(message), "_blank", "noreferrer");
    setStatus("sent");
  }

  return (
    <section className="lead-section" id="contact">
      <div className="lead-intro">
        <span>ייעוץ ללא התחייבות</span>
        <h2>השאירו פרטים ונחזור אליכם</h2>
        <p>שם, טלפון ועיר — זה הכול. נחזור אליכם כדי להבין מה מתאים לחלון ולבית שלכם.</p>
      </div>
      <form className="lead-form" onSubmit={handleSubmit}>
        <label>
          שם מלא
          <input required autoComplete="name" placeholder="איך קוראים לך?" name="name" />
        </label>
        <label>
          טלפון
          <input required inputMode="tel" autoComplete="tel" placeholder="050-0000000" name="phone" />
        </label>
        <label>
          עיר / יישוב
          <input required autoComplete="address-level2" placeholder="לדוגמה: חיפה" name="city" />
        </label>
        <button type="submit">
          <WhatsappIcon /> שליחת פרטים
        </button>
        <small>{status === "sent" ? "נפתח WhatsApp עם הפרטים שלכם — נשלח ונחזור אליכם." : "הפרטים ישמשו רק כדי לחזור אליכם בנוגע לפנייה."}</small>
      </form>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="final-cta">
      <span>בואו נלביש את הבית</span>
      <h2>שלחו לנו תמונה של החלון<br />ונתחיל להתאים לכם פתרון</h2>
      <div className="final-cta-actions">
        <a className="button-wa" href={waLink("היי, מצרף/ת תמונה של החלון שלי")} target="_blank" rel="noreferrer">
          <WhatsappIcon /> שליחת תמונה ב־WhatsApp
        </a>
        <a className="button-outline" href={`tel:${PHONE_TEL}`}>
          <PhoneIcon /> {PHONE_DISPLAY}
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <strong>חוואם דיזיין וילונות</strong>
      <span>מדידה · תפירה · התקנה</span>
    </footer>
  );
}

export function MobileActionBar() {
  return (
    <nav className="mobile-actions" aria-label="יצירת קשר מהירה">
      <a href={`tel:${PHONE_TEL}`}>
        <PhoneIcon /> שיחה
      </a>
      <a href={waLink(DEFAULT_WA_TEXT)} target="_blank" rel="noreferrer">
        <WhatsappIcon /> WhatsApp
      </a>
    </nav>
  );
}
