"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * A single overlay card that fades/slides in over a [start, end] window of
 * the scroll container's progress (0 = top of the 300vh wrapper, 1 = bottom).
 */
export interface ScrollScrubHotspot {
  id: string;
  /** Progress (0-1) at which the hotspot starts fading in. */
  start: number;
  /** Progress (0-1) at which the hotspot starts fading out. */
  end: number;
  content: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface ScrollScrubVideoProps {
  /** Path/URL to the walkthrough video. */
  src: string;
  poster?: string;
  hotspots?: ScrollScrubHotspot[];
  /** Height of the scroll-driving wrapper. Longer = slower scrub. */
  scrollHeight?: string;
  className?: string;
  videoClassName?: string;
}

/**
 * Scroll-scrubbed video walkthrough: a tall scroll container wraps a sticky
 * <video>, and scroll position drives the video's currentTime directly
 * (no playback, no autoplay) so the walkthrough advances exactly as far as
 * the visitor scrolls. Hotspot cards can be layered on top, each tied to
 * its own progress window.
 *
 * Reusable by design: mount one instance per hall/wing, each with its own
 * video src and hotspot set.
 */
export default function ScrollScrubVideo({
  src,
  poster,
  hotspots = [],
  scrollHeight = "300vh",
  className,
  videoClassName,
}: ScrollScrubVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metadataReady, setMetadataReady] = useState(false);
  const pendingTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Wait for duration to be known before any seek is attempted — seeking
  // before loadedmetadata is a no-op at best and throws on some browsers.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function markReady() {
      setMetadataReady(true);
      const currentVideo = videoRef.current;
      if (!currentVideo) return;
      // iOS Safari will not decode/scrub frames until the video has been
      // asked to play at least once, even if playback is muted+playsInline.
      // A play() immediately followed by pause() nudges it into a seekable
      // state without any visible playback.
      const playPromise = currentVideo.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(() => currentVideo.pause()).catch(() => {});
      }
    }

    if (video.readyState >= 1) {
      markReady();
    } else {
      video.addEventListener("loadedmetadata", markReady, { once: true });
      return () => video.removeEventListener("loadedmetadata", markReady);
    }
  }, [src]);

  // Scroll can report far more often than the video can usefully be seeked.
  // Rather than writing currentTime on every change event, stash the latest
  // target and let a single rAF per frame apply it — this coalesces bursts
  // of scroll updates into one seek instead of queueing several.
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const video = videoRef.current;
    if (!video || !metadataReady) return;
    const duration = video.duration;
    if (!duration || Number.isNaN(duration)) return;

    pendingTimeRef.current = Math.min(Math.max(progress, 0), 1) * duration;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const currentVideo = videoRef.current;
        const target = pendingTimeRef.current;
        if (!currentVideo || target === null) return;
        // Skip near-identical seeks — constant sub-frame currentTime writes
        // are what makes scroll-scrubbing stutter on lower-end devices.
        if (Math.abs(currentVideo.currentTime - target) > 0.02) {
          currentVideo.currentTime = target;
        }
      });
    }
  });

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", height: scrollHeight }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          className={videoClassName}
          src={src}
          poster={poster}
          muted
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {hotspots.map((hotspot) => (
          <ScrollHotspotCard
            key={hotspot.id}
            hotspot={hotspot}
            progress={scrollYProgress}
          />
        ))}
      </div>
    </div>
  );
}

function ScrollHotspotCard({
  hotspot,
  progress,
}: {
  hotspot: ScrollScrubHotspot;
  progress: MotionValue<number>;
}) {
  const { start, end, style, className, content } = hotspot;
  const span = end - start;
  // Fade in over the first 15% of the window, fade out over the last 15%,
  // fully visible in between.
  const fadeIn = start + span * 0.15;
  const fadeOut = end - span * 0.15;

  const opacity = useTransform(progress, [start, fadeIn, fadeOut, end], [0, 1, 1, 0]);
  const y = useTransform(progress, [start, fadeIn, fadeOut, end], [24, 0, 0, -24]);

  return (
    <motion.div
      className={className}
      style={{ position: "absolute", opacity, y, ...style }}
    >
      {content}
    </motion.div>
  );
}
