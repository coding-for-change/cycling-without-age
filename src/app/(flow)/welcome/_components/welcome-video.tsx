"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { Locale } from "@/lib/i18n";

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL ?? "";

const VIDEO_LOCALE: Record<Locale, "en" | "de"> = {
  en: "en",
  de: "de",
  da: "en",
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function welcomeVideoSrc(locale: Locale) {
  return `${MEDIA_URL}/videos/welcome-${VIDEO_LOCALE[locale]}.mp4`;
}

export function WelcomeVideo({
  locale,
  active,
  strings,
  onProgress,
  onEnded,
  onUnavailable,
}: {
  locale: Locale;
  active: boolean;
  strings: { mute: string; unmute: string };
  onProgress: (fraction: number) => void;
  onEnded: () => void;
  onUnavailable: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const still = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  useEffect(() => {
    const el = video.current;
    if (el?.error || el?.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)
      onUnavailable();
  }, [onUnavailable]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && !still) el.play().catch(() => undefined);
    else el.pause();
  }, [active, still]);

  useEffect(() => {
    const el = video.current;
    if (!el || !active) return;
    let frame = 0;
    const tick = () => {
      if (el.duration) onProgress(el.currentTime / el.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, onProgress]);

  return (
    <div className="relative max-h-full overflow-hidden rounded-2xl bg-canvas-deeper">
      <video
        ref={video}
        src={welcomeVideoSrc(locale)}
        muted={muted}
        playsInline
        preload="auto"
        controls={still}
        onEnded={onEnded}
        onError={onUnavailable}
        className="block max-h-[min(64dvh,40rem)] w-auto max-w-full"
      />
      {!still && (
        <button
          type="button"
          aria-label={muted ? strings.unmute : strings.mute}
          aria-pressed={!muted}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setMuted((value) => !value);
          }}
          className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {muted ? (
            <VolumeX
              aria-hidden
              className="size-5"
            />
          ) : (
            <Volume2
              aria-hidden
              className="size-5"
            />
          )}
        </button>
      )}
    </div>
  );
}
