"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      anchors: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const syncWithGsapTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(syncWithGsapTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(syncWithGsapTicker);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
