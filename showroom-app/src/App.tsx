import ScrollScrubVideo, {
  type ScrollScrubHotspot,
} from "./components/ScrollScrubVideo";
import "./App.css";

const mainHallHotspots: ScrollScrubHotspot[] = [
  {
    id: "sfold-drape",
    start: 0.1,
    end: 0.28,
    style: {
      insetInlineStart: "5%",
      bottom: "12%",
      width: "min(320px, calc(100vw - 40px))",
    },
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
    style: {
      insetInlineEnd: "5%",
      bottom: "14%",
      width: "min(320px, calc(100vw - 40px))",
    },
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
    style: {
      insetInlineStart: "5%",
      bottom: "12%",
      width: "min(320px, calc(100vw - 40px))",
    },
    content: (
      <div dir="rtl" className="scrub-card">
        <h3>וילון רומאי מודרני</h3>
        <p>Modern Roman Blinds · גובה 2 מטר</p>
      </div>
    ),
  },
];

function App() {
  return (
    <main>
      <section className="intro">
        <h1>HAWAM — סיור גלילה באולם התצוגה</h1>
        <p>גללו למטה כדי להתקדם לאורך האולם</p>
      </section>

      <ScrollScrubVideo
        src="/assets/video/showroom-walkthrough.mp4"
        poster="/assets/images/hall/entrance.jpg"
        hotspots={mainHallHotspots}
      />

      <section className="outro">
        <h2>סוף הסיור</h2>
      </section>
    </main>
  );
}

export default App;
