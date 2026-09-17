import { useEffect, useState } from "react";

import curtainFabricImage from "@/assets/curtain-panel.jpg";
import interiorImage from "@/assets/hawam-interior.jpg";
import { Button } from "@/components/ui/button";

type CurtainSide = "left" | "right";

/* curtain-panel.jpg is a single real photograph of a *pair* of curtain
   panels meeting at a center seam (client-supplied, generated then
   cropped to remove the wall/floor margins so it fills edge to edge).
   Rather than duplicate it, each side shows its own half via
   background-position (left/right) — see .curtain-fabric in styles.css. */
function CurtainPanel({ side }: { side: CurtainSide }) {
  return (
    <div className={`curtain-panel curtain-panel--${side}`} aria-hidden="true">
      <div className="curtain-fabric">
        <img className="curtain-fabric-img" src={curtainFabricImage} alt="" />
        <div className="curtain-inner-shadow" />
      </div>
    </div>
  );
}

function CurtainEntrance({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  return (
    <section
      className={`entrance-layer${open ? " entrance-layer--open" : ""}`}
      aria-label="פתיחת החלל"
    >
      <button
        type="button"
        className="curtain-trigger"
        onClick={onOpen}
        aria-label="פתחו את החלל"
      >
        <CurtainPanel side="left" />
        <CurtainPanel side="right" />
      </button>

      <div className="curtain-track" aria-hidden="true">
        <span />
      </div>

      <div className="entrance-copy">
        <p className="entrance-brand">HAWAM DESIGN</p>
        <button type="button" className="entrance-cta" onClick={onOpen}>
          <span dir="rtl">פתחו את החלל</span>
          <span className="entrance-line" aria-hidden="true" />
        </button>
      </div>

      <button type="button" className="skip-intro" onClick={onOpen}>
        Skip intro
      </button>
    </section>
  );
}

function InnerWindowCurtain({ side }: { side: CurtainSide }) {
  const folds = Array.from({ length: 7 }, (_, index) => index);

  return (
    <div className={`inner-curtain inner-curtain--${side}`} aria-hidden="true">
      <div className="inner-curtain-folds">
        {folds.map((fold) => (
          <span key={fold} className="inner-curtain-fold" />
        ))}
      </div>
      <div className="inner-curtain-weave" />
    </div>
  );
}

function HawamHero({ revealed }: { revealed: boolean }) {
  return (
    <main className={`hawam-hero${revealed ? " hawam-hero--revealed" : ""}`}>
      <img
        className="hero-image"
        src={interiorImage}
        alt="חלל מגורים מודרני עם וילונות בגובה מלא ואור טבעי חם"
        width={1920}
        height={1280}
        fetchPriority="high"
      />

      {/* The photographed room has its own curtains framing the window;
          this pair covers the glass itself (measured from the actual
          photo: ~35.5%–80% of the frame width) so it reads as closed
          until the entrance curtain has cleared, then parts to tuck in
          behind the curtains already visible in the shot — a second,
          smaller echo of the same reveal, now inside the room. */}
      <InnerWindowCurtain side="left" />
      <InnerWindowCurtain side="right" />

      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-brand-mark" aria-hidden="true">
        <span>HAWAM</span>
        <span>DESIGN</span>
      </div>

      <div className="hero-content" dir="rtl">
        <p className="hero-kicker" dir="ltr">HAWAM DESIGN</p>
        <h1>החלון משנה את החלל.</h1>
        <p className="hero-lede">וילונות בהתאמה אישית לעיצוב, לאור ולחיים שלכם.</p>
        <Button variant="hawam" size="hawam">
          לתיאום פגישת עיצוב
        </Button>
        <p className="hero-services">מדידה · התאמה אישית · תפירה · התקנה</p>
      </div>

      <p className="hero-index" aria-hidden="true">01 — WINDOW / SPACE</p>
    </main>
  );
}

export function HawamExperience() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpen(true);
    }
  }, []);

  return (
    <div className="hawam-experience">
      <HawamHero revealed={open} />
      <CurtainEntrance open={open} onOpen={() => setOpen(true)} />
    </div>
  );
}
