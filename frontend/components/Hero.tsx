"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

export default function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        "[data-hero-image]",
        { scale: 1.15 },
        { scale: 1, duration: 1.8, ease: "power2.out" },
        0,
      )
        .fromTo(
          "[data-hero-eyebrow]",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.8 },
          0.2,
        )
        .fromTo(
          "[data-hero-title]",
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 1 },
          "-=0.5",
        )
        .fromTo(
          "[data-hero-sub]",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9 },
          "-=0.6",
        )
        .fromTo(
          "[data-hero-cta]",
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.5",
        );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative flex h-screen min-h-[640px] w-full items-end overflow-hidden"
    >
      <div data-hero-image className="absolute inset-0">
        <Image
          src="/images/luminous-entrance.png"
          alt="סלון מרווח עם וילונות שיפון בגוונים חמים"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/25 to-charcoal/10" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 sm:px-10">
        <p
          data-hero-eyebrow
          className="mb-4 text-sm uppercase tracking-[0.35em] text-sand"
        >
          HAWAM Design
        </p>
        <h1
          data-hero-title
          className="max-w-3xl font-serif text-4xl leading-tight text-ivory sm:text-6xl"
        >
          וילונות שהופכים בית לחוויה
        </h1>
        <p data-hero-sub className="mt-6 max-w-xl text-lg text-ivory/80">
          עיצוב, תפירה והתקנה בהתאמה אישית — מהמדידה בבית ועד הקרס האחרון על
          המוט.
        </p>
        <div data-hero-cta className="mt-10 flex flex-wrap gap-4">
          <a
            href="#contact"
            className="rounded-full bg-sand px-8 py-3 text-sm font-medium text-charcoal transition hover:bg-ivory"
          >
            קביעת פגישת ייעוץ
          </a>
          <a
            href="#collections"
            className="rounded-full border border-ivory/40 px-8 py-3 text-sm font-medium text-ivory transition hover:border-ivory hover:bg-ivory/10"
          >
            צפייה בקולקציות
          </a>
        </div>
      </div>
    </section>
  );
}
