"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { cn, fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { useSetCharacterPose } from "../../_components/character-stage";
import { LanguagePicker } from "../../_components/language-picker";
import { HandsArt, TrishawArt } from "./slide-art";
import { Globe } from "./globe";

const AUTOPLAY_MS = 4000;

type Strings = {
  slides: { headline: string; body: string }[];
  title: string;
  subtitle: string;
  signIn: string;
  explore: string;
  language: string;
  carouselLabel: string;
  progressLabel: string;
};

const SLIDE_ART = [null, TrishawArt, HandsArt] as const;

export function WelcomeCarousel({
  strings,
  locale,
  chapterCoords,
}: {
  strings: Strings;
  locale: Locale;
  chapterCoords: [number, number][];
}) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start" });
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const setCharacterPose = useSetCharacterPose();
  const { play } = useCharacter();
  const tapOrigin = useRef<number | null>(null);
  const { slides } = strings;

  useEffect(() => {
    setCharacterPose(current === 0 ? "hero" : "away");
    return () => setCharacterPose(null);
  }, [current, setCharacterPose]);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      setCurrent(embla.selectedScrollSnap());
      haptics.tap("light");
    };

    const stop = () => setPlaying(false);
    embla.on("select", onSelect).on("pointerDown", stop);
    return () => {
      embla.off("select", onSelect).off("pointerDown", stop);
    };
  }, [embla]);

  useEffect(() => {
    if (!embla || !playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const last = current === slides.length - 1;
    const id = window.setTimeout(
      () => (last ? setPlaying(false) : embla.scrollNext()),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [embla, playing, current, slides.length]);

  const takeOver = () => setPlaying(false);

  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-2 lg:grid-rows-1">
      {}
      <div className="flex min-h-0 min-w-0 flex-col lg:order-2 lg:bg-canvas-deep">
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={slides.length}
          aria-valuenow={current + 1}
          aria-label={fill(strings.progressLabel, {
            current: current + 1,
            total: slides.length,
          })}
          className="flex gap-1.5 px-6 pt-[max(1rem,env(safe-area-inset-top))] lg:px-10 lg:pt-10"
        >
          {slides.map((slide, index) => (
            <span
              key={slide.headline}
              className="h-1 flex-1 overflow-hidden rounded-full bg-line"
            >
              {}
              <span
                style={
                  { "--story-ms": `${AUTOPLAY_MS}ms` } as React.CSSProperties
                }
                className={cn(
                  "block h-full rounded-full bg-ink",
                  index > current
                    ? "scale-x-0 origin-left"
                    : index < current || !playing
                      ? "scale-x-100 origin-left"
                      : "story-fill",
                )}
              />
            </span>
          ))}
        </div>

        {}
        <div
          ref={emblaRef}
          role="group"
          aria-roledescription="carousel"
          aria-label={strings.carouselLabel}
          tabIndex={0}
          onPointerDown={(event) => {
            tapOrigin.current = event.clientX;
          }}
          onClick={(event) => {
            const origin = tapOrigin.current;
            tapOrigin.current = null;
            if (origin === null || Math.abs(event.clientX - origin) > 10)
              return;
            const { left, width } = event.currentTarget.getBoundingClientRect();
            if (event.clientX - left < width / 2) embla?.scrollPrev();
            else embla?.scrollNext();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") embla?.scrollNext();
            else if (event.key === "ArrowLeft") embla?.scrollPrev();
            else return;
            takeOver();
            event.preventDefault();
          }}
          className="flex min-h-0 flex-1 overflow-hidden focus-visible:outline-none"
        >
          <div className="flex w-full">
            {slides.map((slide, index) => (
              <section
                key={slide.headline}
                aria-roledescription="slide"
                aria-label={fill(strings.progressLabel, {
                  current: index + 1,
                  total: slides.length,
                })}
                className="flex min-w-0 flex-[0_0_100%] flex-col justify-end px-6 lg:px-10"
              >
                {/* Slide one belongs to the character, which floats above this
                    space from the layout. The rest carry their own scene. */}
                {(() => {
                  const Art = SLIDE_ART[index];
                  return (
                    <div className="flex min-h-0 flex-1 items-center justify-center py-4">
                      {Art ? <Art /> : null}
                      {index === slides.length - 1 && (
                        <Globe
                          markers={chapterCoords}
                          active={current === index}
                        />
                      )}
                    </div>
                  );
                })()}
                <div className="shrink-0 pt-8 pb-6 lg:pb-10">
                  <h2 className="text-3xl leading-tight tracking-tight text-balance">
                    {slide.headline}
                  </h2>
                  <p className="mt-3 text-base text-ink-soft text-pretty">
                    {slide.body}
                  </p>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="flex flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:order-1 lg:p-10">
        {}
        <div className="mb-4 flex items-center justify-between max-lg:fixed max-lg:top-[max(1.75rem,calc(env(safe-area-inset-top)+1.75rem))] max-lg:right-6 max-lg:z-30 lg:mb-8">
          <div className="ml-auto">
            <LanguagePicker
              locale={locale}
              label={strings.language}
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full lg:max-w-sm">
            {/* Visible only where there is room. A screen reader gets it on
                every width — it is the page's one heading. */}
            <h1 className="font-display text-3xl leading-tight tracking-tight text-balance max-lg:sr-only">
              {strings.title}
            </h1>
            <p className="mt-3 hidden text-base text-ink-soft text-pretty lg:block">
              {strings.subtitle}
            </p>

            <div className="space-y-2 lg:mt-8">
              <Button
                asChild
                size="lg"
                className="h-14 w-full rounded-full bg-red text-base text-white hover:bg-red-hover"
              >
                <Link
                  href="/sign-in"
                  transitionTypes={["nav-forward"]}
                  onClick={() => play("swirl")}
                >
                  {strings.signIn}
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-12 w-full text-base"
              >
                <Link
                  href="/location"
                  transitionTypes={["nav-forward"]}
                >
                  {strings.explore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
