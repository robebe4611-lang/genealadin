import ScrollScrubVideo, {
  type ScrollScrubHotspot,
} from "./components/ScrollScrubVideo";
import "./App.css";

const mainHallHotspots: ScrollScrubHotspot[] = [
  {
    id: "sfold-drape",
    start: 0.08,
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
    start: 0.38,
    end: 0.52,
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
    id: "fabric-library",
    start: 0.68,
    end: 0.85,
    style: {
      insetInlineStart: "5%",
      bottom: "12%",
      width: "min(320px, calc(100vw - 40px))",
    },
    content: (
      <div dir="rtl" className="scrub-card">
        <h3>ספריית הבדים</h3>
        <p>Fabric Library · מאות גוונים ומרקמים לבחירה</p>
      </div>
    ),
  },
];

function App() {
  return (
    <main>
      <ScrollScrubVideo
        src="/assets/video/showroom-walkthrough.mp4"
        poster="/assets/images/hall/entrance.jpg"
        hotspots={mainHallHotspots}
      />
    </main>
  );
}

export default App;
