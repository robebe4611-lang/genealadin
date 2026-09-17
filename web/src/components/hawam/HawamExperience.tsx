import { useEffect, useState } from "react";

import curtainFabricImage from "@/assets/curtain-panel.jpg";
import interiorImage from "@/assets/hawam-interior.jpg";
import { Button } from "@/components/ui/button";
import {
  AboutSection,
  AreasSection,
  FinalCtaSection,
  GallerySection,
  LeadFormSection,
  MobileActionBar,
  OfferSection,
  ProcessSection,
  ServicesSection,
  SiteFooter,
  SiteTopBar,
  TestimonialsSection,
} from "@/components/hawam/SiteSections";

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

function HawamHero({ revealed }: { revealed: boolean }) {
  return (
    <section id="top" className={`hawam-hero${revealed ? " hawam-hero--revealed" : ""}`}>
      <img
        className="hero-image"
        src={interiorImage}
        alt="חלל מגורים מודרני עם וילונות בגובה מלא ואור טבעי חם"
        width={1264}
        height={843}
        fetchPriority="high"
      />

      <div className="hero-shade" aria-hidden="true" />

      <div className="hero-brand-mark" aria-hidden="true">
        <span>HAWAM</span>
        <span>DESIGN</span>
      </div>

      <div className="hero-content" dir="rtl">
        <p className="hero-kicker" dir="ltr">HAWAM DESIGN</p>
        <h1>הווילון שמשנה את החלל.</h1>
        <p className="hero-lede">וילונות בהתאמה אישית לעיצוב, לאור ולחיים שלכם.</p>
        <Button variant="hawam" size="hawam">
          לתיאום פגישת עיצוב
        </Button>
        <p className="hero-services">מדידה · התאמה אישית · תפירה · התקנה</p>
      </div>
    </section>
  );
}

export function HawamExperience() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("curtain-locked", !open);
    return () => document.body.classList.remove("curtain-locked");
  }, [open]);

  // The hero's height is 100svh minus the sticky topbar's real height (see
  // .hawam-hero in styles.css) — measured here since it varies by
  // breakpoint/content in a way a single CSS fallback can't track.
  useEffect(() => {
    const setTopbarHeight = () => {
      const topbar = document.querySelector<HTMLElement>(".site-topbar");
      if (topbar) {
        document.documentElement.style.setProperty("--topbar-h", `${topbar.offsetHeight}px`);
      }
    };
    setTopbarHeight();
    window.addEventListener("resize", setTopbarHeight);
    return () => window.removeEventListener("resize", setTopbarHeight);
  }, []);

  return (
    <div className="hawam-experience">
      <SiteTopBar />
      <main>
        <HawamHero revealed={open} />
        <AboutSection />
        <OfferSection />
        <ServicesSection />
        <GallerySection />
        <TestimonialsSection />
        <ProcessSection />
        <AreasSection />
        <LeadFormSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
      <MobileActionBar />
      <CurtainEntrance open={open} onOpen={() => setOpen(true)} />
    </div>
  );
}
