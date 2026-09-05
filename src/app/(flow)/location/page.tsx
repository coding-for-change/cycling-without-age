import { Suspense } from "react";
import { headers } from "next/headers";
import { chapters } from "@/features/chapters";
import { getSession } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { readJoinPreset } from "@/lib/join-preset";
import { stepProgress } from "@/lib/onboarding";
import { LocationScreen } from "./_components/location-screen";
import { LocationSkeleton } from "./_components/location-skeleton";
import { StepTransition } from "../_components/step-transition";

/* Deliberately not `"use cache"`: a cached scope with no request-scoped inputs
   is filled during prerendering, which makes `next build` open a database
   connection — CI builds with no services, and a build could otherwise bake an
   empty chapter list into the static shell. The read follows its request-time
   caller instead, inside the <Suspense> boundary below, and the route still
   partial-prerenders. */
async function getChapterPins() {
  return (await chapters.listChapters()).map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    city: chapter.city,
    careHomeName: chapter.careHomeName,
    coords: { lat: chapter.latitude, lng: chapter.longitude },
  }));
}

export default function LocationPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  return (
    <StepTransition>
      <Suspense fallback={<LocationSkeleton />}>
        <Location searchParams={searchParams} />
      </Suspense>
    </StepTransition>
  );
}

async function Location({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const [dict, words, session, pins, params, head, preset] = await Promise.all([
    getDictionary(),
    getLocale(),
    getSession(),
    getChapterPins(),
    searchParams,
    headers(),
    readJoinPreset(),
  ]);

  const mode = !session
    ? "guest"
    : params.as === "pilot"
      ? "pilot"
      : "passenger";

  const at =
    mode === "guest"
      ? null
      : stepProgress(
          {
            role: mode,
            presetRole: Boolean(preset.role),
            presetChapter: false,
          },
          "location",
        );

  return (
    <LocationScreen
      mode={mode}
      chapters={pins}
      strings={dict.location}
      words={words}
      notation={resolveLocale(head.get("accept-language"))}
      progress={at && { ...at, label: dict.common.stepProgress }}
    />
  );
}
