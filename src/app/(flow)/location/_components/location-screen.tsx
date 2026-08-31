"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin, MapPinOff, Search } from "lucide-react";
import { applyToChaptersAsPilot } from "@/features/membership/actions";
import {
  formatDistance,
  formatDuration,
  formatNumber,
  type Locale,
} from "@/lib/format";
import type { Coords } from "@/lib/geo";
import { getPosition, type GeoFailure } from "@/lib/native/geolocation";
import { haptics } from "@/lib/native/haptics";
import { Character, useCharacter } from "@/components/character";
import { cn, fill } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepDots, type StepProgress } from "../../_components/step";
import { useSetCharacterPose } from "../../_components/character-stage";
import { nextOnboardingPath } from "../../onboarding/actions";
import {
  rememberGuestChapter,
  resolveHomeAddress,
  settlePassengerAt,
  type HomeResolution,
} from "../actions";
import { AddressSearch } from "./address-search";
import { rankChapters } from "./rank";

const ChapterMap = dynamic(() => import("./chapter-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export type ChapterPin = {
  id: string;
  name: string;
  city: string;
  careHomeName: string | null;
  coords: Coords;
};

type LocationState =
  | { status: "locating" }
  | { status: "located"; coords: Coords }
  | { status: "unavailable"; reason: GeoFailure };

type Residence = "careHome" | "home";
type Resolved = Extract<HomeResolution, { ok: true }>;

export function LocationScreen({
  mode,
  chapters,
  strings,
  words,
  notation,
  progress,
}: {
  mode: "guest" | "pilot" | "passenger";
  chapters: ChapterPin[];
  strings: Strings;
  words: string;
  notation: Locale;
  progress: StepProgress | null;
}) {
  const router = useRouter();
  const character = useCharacter();
  const setCharacterPose = useSetCharacterPose();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [where, setWhere] = useState<LocationState>({ status: "locating" });
  const [residence, setResidence] = useState<Residence>("careHome");
  const [home, setHome] = useState<Resolved | null>(null);
  const [resolving, setResolving] = useState(false);
  const [pending, startTransition] = useTransition();

  const multi = mode === "pilot";
  const atHome = mode === "passenger" && residence === "home";
  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);


  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const consoling = Boolean(home && !home.inRange);
  useEffect(() => {
    setCharacterPose(consoling ? "away" : "compact");
    return () => setCharacterPose(null);
  }, [setCharacterPose, consoling]);


  useEffect(() => {
    let live = true;
    void getPosition().then((result) => {
      if (!live) return;
      setWhere(
        result.ok
          ? { status: "located", coords: result.coords }
          : { status: "unavailable", reason: result.reason },
      );
    });
    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      rankChapters({
        chapters,
        query,
        here: where.status === "located" ? where.coords : null,
        locale: words,
      }),
    [chapters, query, where, words],
  );

  const toggle = (id: string) => {
    haptics.selectionChanged();
    setError(null);
    setSelected((previous) =>
      multi
        ? previous.includes(id)
          ? previous.filter((other) => other !== id)
          : [...previous, id]
        : [id],
    );
  };

  const pickAddress = (mapboxId: string) => {
    setResolving(true);
    setError(null);
    void resolveHomeAddress({ mapboxId, sessionToken }).then((result) => {
      setResolving(false);
      if (!result.ok) {
        setError(strings.errors.generic);
        return;
      }
      setHome(result);
      setSelected(result.chapter ? [result.chapter.id] : []);

      if (!result.inRange) character.say("triste", 3000);
      else haptics.success();
    });
  };

  const fail = (problem: string) => {
    haptics.error();
    setError(strings.errors[problem] ?? strings.errors.generic);
  };

  const go = (next: string) => {
    haptics.success();
    router.push(next, { transitionTypes: ["nav-forward"] });
  };

  const submit = () =>
    startTransition(async () => {
      if (mode === "guest") {
        const result = await rememberGuestChapter(selected[0]);
        return result.ok ? go("/passenger") : fail(result.error);
      }

      if (multi) {
        const result = await applyToChaptersAsPilot(selected);
        // Asked separately: the join goes through the membership feature's own
        // action, and that slice has no business knowing about onboarding.
        return result.ok ? go(await nextOnboardingPath()) : fail(result.error);
      }

      if (atHome) {
        if (!home?.chapter) return fail("generic");
        const result = await settlePassengerAt({
          residence: "home",
          chapterId: home.chapter.id,
          home: {
            address: home.address,
            latitude: home.coords.lat,
            longitude: home.coords.lng,
          },
        });
        return result.ok ? go(result.next) : fail(result.error);
      }

      const result = await settlePassengerAt({
        residence: "careHome",
        chapterId: selected[0],
      });
      return result.ok ? go(result.next) : fail(result.error);
    });

  const ready = atHome ? Boolean(home?.chapter) : selected.length > 0;

  const label = pending
    ? strings.pending
    : atHome
      ? home && !home.inRange && home.chapter
        ? fill(strings.home.joinAnyway, { chapter: home.chapter.name })
        : strings.home.confirm
      : !multi
        ? strings.next
        : selected.length > 1
          ? fill(strings.requestCount, {
              count: formatNumber(selected.length, notation),
            })
          : strings.request;

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-2 lg:items-stretch">
      {/* Half the viewport on desktop, like the character's half on every other
          step. Second in the grid, first in the DOM, so the mobile column still
          opens on the map. */}
      <div className="h-[45dvh] shrink-0 lg:order-2 lg:h-auto lg:min-h-dvh">
        {hasToken ? (
          <ChapterMap
            chapters={chapters}
            selected={selected}
            here={where.status === "located" ? where.coords : null}
            home={atHome ? (home?.coords ?? null) : null}
            route={atHome ? (home?.route?.path ?? null) : null}
            label={strings.mapLabel}
          />
        ) : (
          <div className="grid size-full place-items-center bg-canvas-deep p-6 text-center">
            <p className="max-w-xs text-sm text-ink-soft">
              <MapPinOff
                className="mx-auto mb-3 size-6"
                aria-hidden
              />
              {strings.mapUnavailable}
            </p>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-line lg:order-1 lg:min-h-dvh lg:border-r">
        {/* lg: the corner character sits over this column — start below it,
            the same clearance the Step frame gives it on mobile. */}
        <div className="shrink-0 px-5 pt-5 pb-3 lg:px-8 lg:pt-22">
          {progress && (
            <StepDots
              {...progress}
              className="mb-4"
            />
          )}
          <h1 className="text-2xl tracking-tight text-balance">
            {mode === "passenger" ? strings.titlePassenger : strings.title}
          </h1>

          {mode === "passenger" ? (
            <Tabs
              value={residence}
              onValueChange={(value) => {
                haptics.selectionChanged();
                setError(null);
                setSelected([]);
                setHome(null);
                setResidence(value as Residence);
              }}
              className="mt-4"
            >
              {}
              <TabsList className="w-full rounded-full bg-grey-tint p-1 group-data-[orientation=horizontal]/tabs:h-12">
                {(["careHome", "home"] as const).map((option) => (
                  <TabsTrigger
                    key={option}
                    value={option}
                    className="rounded-full text-base data-[state=active]:bg-canvas data-[state=active]:text-ink"
                  >
                    {strings.tabs[option]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
              {where.status === "locating" && (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              )}
              {where.status === "located"
                ? strings.subtitleNearby
                : where.status === "locating"
                  ? strings.locating
                  : where.reason === "denied"
                    ? strings.permissionDenied
                    : strings.subtitleAll}
            </p>
          )}

          {!atHome && (
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <label
                htmlFor="chapter-search"
                className="sr-only"
              >
                {strings.searchLabel}
              </label>
              <Input
                id="chapter-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={strings.searchPlaceholder}
                autoComplete="off"
                className="h-12 rounded-full border-line pl-11 text-base"
              />
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-1 pb-40 lg:px-6 lg:pb-4">
          {atHome ? (
            <HomePanel
              home={home}
              resolving={resolving}
              notation={notation}
              strings={strings}
              sessionToken={sessionToken}
              language={words}
              onPick={(suggestion) => pickAddress(suggestion.id)}
              onClear={() => {
                setHome(null);
                setSelected([]);
              }}
            />
          ) : rows.length === 0 ? (
            <p className="px-2 py-10 text-center text-ink-soft">
              {strings.noResults}
            </p>
          ) : (
            <ul
              role="listbox"
              aria-multiselectable={multi}
              aria-label={strings.title}
              className="space-y-1"
            >
              {rows.map((chapter) => {
                const isSelected = selected.includes(chapter.id);
                return (
                  <li
                    key={chapter.id}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(chapter.id)}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-(--r-card) px-4 py-3 text-left transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                        isSelected
                          ? "bg-mint-tint ring-1 ring-mint"
                          : "hover:bg-canvas-deep",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint">
                        {isSelected ? (
                          <Check
                            className="size-5 text-ink"
                            aria-hidden
                          />
                        ) : (
                          <MapPin
                            className="size-5 text-ink"
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">
                          {chapter.name}
                        </span>
                        <span className="block truncate text-sm text-ink-soft">
                          {chapter.careHomeName ?? chapter.city}
                        </span>
                      </span>
                      {chapter.distance !== null && (
                        <span className="shrink-0 text-sm tabular-nums text-ink-soft">
                          {fill(strings.distanceAway, {
                            distance: formatDistance(
                              chapter.distance,
                              notation,
                            ),
                          })}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 bg-linear-to-t from-canvas via-canvas px-5 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:static lg:border-t lg:border-line lg:bg-none lg:p-6">
          {error && (
            <p
              role="alert"
              className="mb-2 text-center text-sm text-red"
            >
              {error}
            </p>
          )}
          {!ready && !error && (
            <p className="mb-2 text-center text-sm text-ink-soft">
              {atHome ? strings.home.hint : strings.selectPrompt}
            </p>
          )}
          <Button
            size="lg"
            disabled={!ready || pending}
            onClick={submit}
            className="h-14 w-full rounded-full bg-red text-base text-white shadow-lift hover:bg-red-hover disabled:bg-grey-tint disabled:text-ink-faint disabled:shadow-none"
          >
            {label}
          </Button>
        </div>
      </div>
    </div>
  );
}


function HomePanel({
  home,
  resolving,
  notation,
  strings,
  sessionToken,
  language,
  onPick,
  onClear,
}: {
  home: Resolved | null;
  resolving: boolean;
  notation: Locale;
  strings: Strings;
  sessionToken: string;
  language: string;
  onPick: (suggestion: { id: string }) => void;
  onClear: () => void;
}) {
  if (resolving) {
    return (
      <div className="space-y-2 px-2 py-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!home?.chapter) {
    return (
      <div className="px-2 pt-2">
        <AddressSearch
          sessionToken={sessionToken}
          language={language}
          strings={strings.home}
          onPick={onPick}
        />
      </div>
    );
  }

  const distance = formatDistance(home.distanceMeters ?? 0, notation);

  return (
    <div className="space-y-4 px-2 pt-2">
      <button
        type="button"
        onClick={onClear}
        className="flex w-full items-start gap-3 rounded-(--r-card) border border-line bg-canvas p-4 text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
      >
        <MapPin
          className="mt-0.5 size-5 shrink-0 text-ink-faint"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-soft">
            {strings.home.label}
          </span>
          <span className="block font-medium text-ink">{home.address}</span>
        </span>
      </button>

      {home.inRange ? (
        <div className="rounded-(--r-tile) bg-mint-tint p-5">
          <p className="text-sm text-ink-soft">{strings.home.nearest}</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">
            {home.chapter.careHomeName ?? home.chapter.name}
          </p>
          <p className="mt-2 text-sm text-ink">
            {home.route
              ? fill(strings.home.duration, {
                  duration: formatDuration(home.route.durationSec, notation),
                })
              : fill(strings.distanceAway, { distance })}
          </p>
        </div>
      ) : (
        <div className="rounded-(--r-tile) border border-line bg-canvas p-5">
          <Character
            size={104}
            expression="triste"
            follow={false}
            className="mx-auto mb-2 text-mint"
          />
          <p className="font-display text-xl font-bold text-ink">
            {strings.home.outOfRangeTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {fill(strings.home.outOfRangeBody, {
              chapter: home.chapter.name,
              distance,
              radius: formatDistance(home.chapter.radiusKm * 1000, notation),
            })}
          </p>
        </div>
      )}
    </div>
  );
}

type Strings = {
  title: string;
  titlePassenger: string;
  subtitleNearby: string;
  subtitleAll: string;
  locating: string;
  permissionDenied: string;
  searchLabel: string;
  searchPlaceholder: string;
  noResults: string;
  distanceAway: string;
  mapUnavailable: string;
  mapLabel: string;
  retry: string;
  pending: string;
  next: string;
  request: string;
  requestCount: string;
  selectPrompt: string;
  tabs: { careHome: string; home: string };
  home: {
    label: string;
    placeholder: string;
    hint: string;
    searching: string;
    noResults: string;
    nearest: string;
    duration: string;
    confirm: string;
    outOfRangeTitle: string;
    outOfRangeBody: string;
    joinAnyway: string;
  };
  errors: Record<string, string>;
};
