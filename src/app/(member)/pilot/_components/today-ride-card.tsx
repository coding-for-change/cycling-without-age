import Link from "next/link";
import { ChevronRight, Flag, MapPin, Navigation } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import {
  OpenInMapsSheet,
  type MapPlace,
  type OpenInMapsStrings,
} from "@/features/rides/components/open-in-maps-sheet";
import type { Locale } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TodayRider = { key: string; name: string; avatar: string };

const PILL =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors motion-reduce:transition-none";

export function TodayRideCard({
  href,
  finishHref,
  eyebrow,
  live,
  title,
  riders,
  ridersLine,
  place,
  placeLine,
  finishHint,
  strings,
  mapStrings,
  words,
}: {
  href: string;
  finishHref: string | null;
  eyebrow: string;
  live: boolean;
  title: string;
  riders: TodayRider[];
  ridersLine: string;
  place: MapPlace | null;
  placeLine: string | null;
  finishHint: string;
  strings: { navigate: string; finish: string; details: string };
  mapStrings: OpenInMapsStrings;
  words: Locale;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-paper p-5 shadow-lift">
      <Link
        href={href}
        transitionTypes={["push"]}
        aria-label={`${strings.details}: ${title}`}
        className="group -m-1 flex flex-col gap-1.25 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <span className="flex items-center gap-2 text-2sm font-medium text-ink-soft">
          {live ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-red motion-safe:animate-pulse"
            />
          ) : null}
          {eyebrow}
        </span>
        <span className="flex items-center gap-1 font-display text-xl leading-snug font-bold tracking-tight text-balance text-ink">
          <span className="line-clamp-2">{title}</span>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {riders.length > 0 ? (
          <span className="flex shrink-0 -space-x-2">
            {riders.slice(0, 3).map((rider) => (
              <PersonAvatar
                key={rider.key}
                svg={rider.avatar}
                size="sm"
                className="ring-2 ring-paper"
              />
            ))}
          </span>
        ) : null}
        <span className="min-w-0 truncate text-sm">{ridersLine}</span>
      </div>

      {placeLine ? (
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <MapPin
            aria-hidden
            className="mt-0.5 size-4 shrink-0"
          />
          <span className="min-w-0">{placeLine}</span>
        </p>
      ) : null}

      {finishHref ? (
        <p className="text-2sm text-ink-soft">{finishHint}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {finishHref ? (
          <Button
            asChild
            className={cn(
              PILL,
              "flex-1 bg-mint-deep text-white hover:bg-mint-deep/90",
            )}
          >
            <Link
              href={finishHref}
              transitionTypes={["push"]}
            >
              <Flag aria-hidden />
              {strings.finish}
            </Link>
          </Button>
        ) : null}
        {place ? (
          <OpenInMapsSheet
            place={place}
            strings={mapStrings}
            words={words}
            className="w-auto flex-1 rounded-full"
          >
            <span
              className={cn(
                PILL,
                "w-full border border-line bg-canvas text-ink hover:bg-canvas-deep",
              )}
            >
              <Navigation
                aria-hidden
                className="size-4"
              />
              {strings.navigate}
            </span>
          </OpenInMapsSheet>
        ) : null}
      </div>
    </article>
  );
}
