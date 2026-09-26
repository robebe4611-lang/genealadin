"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TextureBanner() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageRef.current,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex h-[70vh] min-h-[480px] items-center overflow-hidden"
    >
      <div ref={imageRef} className="absolute inset-0 -top-16 -bottom-16">
        <Image
          src="/images/ivory-curtains-texture.png"
          alt="מרקם בד וילון מקרוב"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-charcoal/45" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-ivory sm:px-10">
        <p className="text-sm uppercase tracking-[0.3em] text-sand">
          איכות שרואים מקרוב
        </p>
        <h2 className="mt-4 font-serif text-3xl leading-snug sm:text-4xl">
          בדים נבחרים, תפרים מדויקים, ותשומת לב לכל קפל
        </h2>
      </div>
    </section>
  );
}
