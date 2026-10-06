"use client";

import {
  Suspense,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Bike,
  ChevronDown,
  ChevronRight,
  Flag,
  MapPin,
  Minus,
  NotebookPen,
  Plus,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { notify } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import {
  MarkdownEditor,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";
import { PeoplePicker, type PersonOption } from "@/components/people-picker";
import {
  PhotoGallery,
  type PhotoGalleryLabels,
} from "@/components/photo-gallery/photo-gallery";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  availableTrishawsAction,
  estimateRouteAction,
  scheduleRideAction,
} from "@/features/rides/actions";
import {
  coordsOf,
  placeFromResolved,
  PlaceValue,
  RouteSummary,
  type Place,
} from "@/features/rides/components/place";
import { LazyRideMap } from "@/features/rides/components/ride-map-lazy";
import { ridePhotoUpload } from "@/features/rides/components/ride-photo-upload";
import type { TrishawOption } from "@/features/rides/components/trishaw-options";
import {
  WhenField,
  type WhenFieldStrings,
} from "@/features/rides/components/when-field";
import {
  modelLimits,
  parseCapacity,
  PLEASURE_LIMITS,
  RIDE_DESCRIPTION_MAX,
  RIDE_MAX_CAPACITY,
  RIDE_MAX_MINUTES,
  RIDE_MAX_PHOTOS,
  RIDE_MAX_PILOTS,
  RIDE_MIN_MINUTES,
  RIDE_MODELS,
  RIDE_NOTE_MAX,
  RIDE_TITLE_MAX,
  type RideModelName,
  type WallSlot,
} from "@/features/rides/schemas";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { clockLabel, clockToMinutes, DEFAULT_SLOT_MINUTES } from "@/lib/clock";
import type { Locale as NotationLocale } from "@/lib/format";
import type { RideErrors } from "@/features/rides/components/strings";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { Route } from "@/lib/mapbox";
import { haptics } from "@/lib/native/haptics";
import { hrefWith } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { PlaceSearch } from "../../_components/place-search";
import { Segmented } from "../../_components/segmented";
import {
  TrishawOptionRow,
  type TrishawOptionLabels,
} from "./trishaw-option-row";

export type ScheduleChapter = {
  id: string;
  name: string;
  timeZone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  date: string;
  start: string;
  durationMinutes?: number;
  durationChosen?: boolean;
};

type CrewMember = PersonOption & { chapterId: string };

export type ScheduleCrew = {
  passengers: CrewMember[];
  pilots: CrewMember[];
};

type Choice = { value: number; label: string };

type Strings = Dictionary["rides"]["schedule"];
type PeopleStrings = Dictionary["rides"]["people"];

type FleetLabels = TrishawOptionLabels & {
  selected: string;
  nothingSelected: string;
};

type Props = {
  chapters: ScheduleChapter[];
  crew: Promise<ScheduleCrew> | null;
  stays: Choice[];
  locale: NotationLocale;
  language: Locale;
  strings: Strings;
  when: WhenFieldStrings;
  people: PeopleStrings;
  gallery: Dictionary["common"]["gallery"];
  photos: string;
  address: Dictionary["common"]["address"];
  markdown: MarkdownToolLabels;
  models: Dictionary["calendar"]["models"];
  errors: RideErrors;
  fleet: FleetLabels;
};

const DEFAULT_STAY = 60;
const LOOKUP_DELAY_MS = 250;
const ROUTE_BUFFER_MINUTES = 10;
const ROUTE_ROUNDING = 5;
const LAST_CHAPTER = "cwa:rides:schedule:chapter";

const FIELD =
  "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-line px-2.5 text-left text-2sm transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none data-[state=open]:bg-canvas-deep";
const EMPTY_FIELD = "border-dashed text-ink-soft";
const STEP_BUTTON =
  "inline-flex h-full w-9 items-center justify-center text-ink-soft transition-colors first:rounded-l-lg last:rounded-r-lg hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

const chapterPlace = (chapter: ScheduleChapter): Place | null =>
  chapter.latitude === null || chapter.longitude === null
    ? null
    : {
        name: chapter.name,
        address: chapter.address ?? chapter.name,
        latitude: chapter.latitude,
        longitude: chapter.longitude,
      };

const minutesForRoute = (route: Route) => {
  const raw = route.durationSec / 60 + ROUTE_BUFFER_MINUTES;
  const rounded = Math.ceil(raw / ROUTE_ROUNDING) * ROUTE_ROUNDING;
  return Math.min(RIDE_MAX_MINUTES, Math.max(RIDE_MIN_MINUTES, rounded));
};

function rememberedChapter(chapters: ScheduleChapter[]) {
  try {
    const saved = window.localStorage.getItem(LAST_CHAPTER);
    if (saved && chapters.some((chapter) => chapter.id === saved)) return saved;
  } catch {}
  return chapters[0].id;
}

function rememberChapter(id: string) {
  try {
    window.localStorage.setItem(LAST_CHAPTER, id);
  } catch {}
}

export function ScheduleRideDrawer(props: Props) {
  const { creating } = useDrawerParam();
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(creating);
  if (creating !== wasOpen) {
    setWasOpen(creating);
    if (creating) setSession((current) => current + 1);
  }

  return (
    <ScheduleRideSheet
      key={session}
      open={creating}
      {...props}
    />
  );
}

function ScheduleRideSheet({
  open,
  chapters,
  crew,
  stays,
  locale,
  language,
  strings,
  when,
  people,
  gallery,
  photos,
  address,
  markdown,
  models,
  errors,
  fleet,
}: Props & { open: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { close } = useDrawerParam();
  const formId = useId();
  const titleId = useId();
  const roundTripId = useId();
  const stayId = useId();
  const noteId = useId();
  const capacityId = useId();
  const titleField = useRef<HTMLInputElement>(null);
  const capacityField = useRef<HTMLInputElement>(null);
  const endEdited = useRef(
    chapters.some((chapter) => chapter.durationChosen === true),
  );
  const [pending, startTransition] = useTransition();

  const [chapterId, setChapterId] = useState(() => rememberedChapter(chapters));
  const chapter =
    chapters.find((candidate) => candidate.id === chapterId) ?? chapters[0];
  const home = chapterPlace(chapter);
  const [model, setModel] = useState<RideModelName>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<number | null>(null);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [slot, setSlot] = useState<WallSlot>({
    date: chapter.date,
    start: chapter.start,
    durationMinutes: chapter.durationMinutes ?? DEFAULT_SLOT_MINUTES,
  });
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [stay, setStay] = useState(DEFAULT_STAY);
  const [pilotsNeeded, setPilotsNeeded] = useState(1);
  const [passengerIds, setPassengerIds] = useState<string[]>([]);
  const [pilotIds, setPilotIds] = useState<string[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [fetched, setFetched] = useState<{
    key: string;
    options: TrishawOption[] | null;
  } | null>(null);
  const [routed, setRouted] = useState<{
    key: string;
    route: Route | null;
  } | null>(null);

  const event = model === "event";
  const pleasure = model === "pleasure";
  const functional = model === "functional";
  const twoWay = functional && roundTrip;
  const requiredPilots = pleasure ? PLEASURE_LIMITS.pilots : pilotsNeeded;
  const limits = modelLimits(model, capacity, requiredPilots);

  const lookup = JSON.stringify({
    chapterId: chapter.id,
    slot,
    roundTrip: twoWay,
    stayMinutes: twoWay ? stay : 0,
  });

  useEffect(() => {
    if (!open) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await availableTrishawsAction(JSON.parse(lookup)).catch(
        () => null,
      );
      if (!live) return;
      const options = result?.ok ? result.options : null;
      setFetched({ key: lookup, options });
      if (options)
        setSelected((current) => {
          const free = new Set(
            options
              .filter((option) => option.blocked === null)
              .map((option) => option.id),
          );
          return new Set([...current].filter((id) => free.has(id)));
        });
    }, LOOKUP_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, lookup]);

  const routeKey =
    functional && origin && destination
      ? JSON.stringify({ from: coordsOf(origin), to: coordsOf(destination) })
      : null;

  useEffect(() => {
    if (!open || !routeKey) return;
    let live = true;
    estimateRouteAction(JSON.parse(routeKey))
      .catch(() => null)
      .then((result) => {
        if (!live) return;
        const route = result?.ok ? result.route : null;
        setRouted({ key: routeKey, route });
        if (route && !endEdited.current)
          setSlot((current) => ({
            ...current,
            durationMinutes: minutesForRoute(route),
          }));
      });
    return () => {
      live = false;
    };
  }, [open, routeKey]);

  const routeLoading = routeKey !== null && routed?.key !== routeKey;
  const route =
    routeKey !== null && routed?.key === routeKey ? routed.route : null;

  const loading = fetched?.key !== lookup;
  const options = fetched?.options;
  const free = new Set(
    (options ?? [])
      .filter((option) => option.blocked === null)
      .map((option) => option.id),
  );
  const picked = [...selected].filter((id) => free.has(id));

  const toggleTrishaw = (id: string, on: boolean) =>
    setSelected((current) => {
      if (on && pleasure) return new Set([id]);
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const pickModel = (next: RideModelName) => {
    setModel(next);
    if (next !== "functional") {
      setDestination(null);
      setRouted(null);
    }
    const nextLimits = modelLimits(
      next,
      capacity,
      next === "pleasure" ? PLEASURE_LIMITS.pilots : pilotsNeeded,
    );
    const trim = (ids: string[], max: number | null) =>
      max === null ? ids : ids.slice(0, max);
    setPassengerIds((current) => trim(current, nextLimits.passengers));
    setPilotIds((current) => trim(current, nextLimits.pilots));
    setSelected((current) => new Set(trim([...current], nextLimits.trishaws)));
  };

  const pickChapter = (id: string) => {
    if (id === chapter.id) return;
    setChapterId(id);
    rememberChapter(id);
    setSelected(new Set());
    setOrigin(null);
    setDestination(null);
    setPassengerIds([]);
    setPilotIds([]);
  };

  const changeSlot = (next: WallSlot) => {
    if (next.durationMinutes !== slot.durationMinutes) endEdited.current = true;
    setSlot(next);
  };

  const changePilotsNeeded = (next: number) => {
    setPilotsNeeded(next);
    setPilotIds((current) => current.slice(0, next));
  };

  const refuse = (message: string, focus?: () => void) => {
    toast.error(message);
    haptics.error();
    focus?.();
  };

  const submit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (pending) return;
    const trimmedTitle = title.trim();
    if (event && !trimmedTitle) {
      setTitleInvalid(true);
      return refuse(errors.titleRequired, () => titleField.current?.focus());
    }
    if (event && capacity === null)
      return refuse(errors.capacityRequired, () =>
        capacityField.current?.focus(),
      );
    if (functional && !destination) return refuse(errors.destinationRequired);

    const trimmedNote = note.trim();
    const trimmedDescription = description.trim();
    startTransition(async () => {
      const result = await scheduleRideAction({
        chapterId: chapter.id,
        model,
        slot,
        locationName: origin?.name ?? null,
        locationAddress: origin?.address ?? null,
        latitude: origin?.latitude ?? null,
        longitude: origin?.longitude ?? null,
        destinationName: functional ? (destination?.name ?? null) : null,
        destinationAddress: functional ? (destination?.address ?? null) : null,
        destinationLatitude: functional
          ? (destination?.latitude ?? null)
          : null,
        destinationLongitude: functional
          ? (destination?.longitude ?? null)
          : null,
        roundTrip: twoWay,
        stayMinutes: twoWay ? stay : 0,
        trishawIds: picked,
        requiredPilots,
        note: trimmedNote || null,
        title: event ? trimmedTitle : null,
        description: event ? trimmedDescription || null : null,
        capacity:
          event && capacity !== null
            ? Math.max(capacity, passengerIds.length)
            : null,
        photoFileIds: event ? photoIds : [],
        passengerIds,
        pilotIds,
      });
      notify(result, {
        done: twoWay ? strings.scheduledRoundTrip : strings.scheduled,
        errors,
      });
      if (result.ok)
        router.replace(
          hrefWith(`/admin/rides/${result.id}`, searchParams, { new: null }),
        );
    });
  };

  const placeStrings = (label: string, placeholder: string) => ({
    label,
    placeholder,
    hint: strings.placeHint,
    searching: address.searching,
    noResults: address.noResults,
  });

  const peopleStrings = (role: "passengers" | "pilots") => ({
    ...people[role],
    search: people.search,
    empty: people.empty,
    count: people.count,
    full: people.full,
  });

  const photoLabels: PhotoGalleryLabels = { ...gallery, errors };
  const showMap = Boolean(origin || (functional && destination));
  const trishawCount = picked.length;

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) close();
      }}
      dismissible={!pending}
      title={
        <span className="flex min-w-0 items-center gap-1.25 text-base">
          {chapters.length > 1 ? (
            <ChapterPicker
              chapters={chapters}
              value={chapter.id}
              onChange={pickChapter}
              label={formatMessage(
                strings.chapterPick,
                { chapter: chapter.name },
                language,
              )}
            />
          ) : (
            <span className="truncate font-medium text-ink-soft">
              {chapter.name}
            </span>
          )}
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-ink-faint"
          />
          <span className="truncate">{strings.newRide}</span>
        </span>
      }
      bodyClassName="px-4 py-4 md:px-5"
      footer={
        <>
          <p
            aria-live="polite"
            className="mr-auto text-2sm text-ink-soft"
          >
            {trishawCount === 0
              ? fleet.nothingSelected
              : formatMessage(
                  fleet.selected,
                  { count: trishawCount },
                  language,
                )}
          </p>
          <Button
            type="submit"
            form={formId}
            disabled={pending}
            variant="brand"
            className="min-h-10"
          >
            {pending ? <Spinner aria-hidden /> : null}
            {pending ? strings.submitting : strings.submit}
            <Kbd className="hidden bg-white/20 text-white sm:inline-flex">
              {strings.shortcut}
            </Kbd>
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={submit}
        onKeyDown={submitOnCmdEnter}
        aria-busy={pending}
        className="grid"
      >
        <Section className="gap-3">
          <div className="grid gap-1.25">
            <Segmented
              value={model}
              options={RIDE_MODELS.map((value) => ({
                value,
                label: models[value],
              }))}
              onChange={pickModel}
              label={strings.model}
              className="w-fit"
            />
            <p
              aria-live="polite"
              className="text-2sm text-ink-soft"
            >
              {strings.modelHints[model]}
            </p>
          </div>

          {event ? (
            <div className="grid gap-2">
              <label
                htmlFor={titleId}
                className="sr-only"
              >
                {strings.eventTitle}
              </label>
              <input
                ref={titleField}
                id={titleId}
                value={title}
                maxLength={RIDE_TITLE_MAX}
                placeholder={strings.eventTitle}
                aria-invalid={titleInvalid || undefined}
                autoComplete="off"
                onChange={(change) => {
                  setTitle(change.target.value);
                  if (change.target.value.trim()) setTitleInvalid(false);
                }}
                className="w-full bg-transparent text-lg font-semibold text-ink outline-none placeholder:text-ink-faint aria-invalid:placeholder:text-red"
              />
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                labels={markdown}
                minRows={3}
                maxLength={RIDE_DESCRIPTION_MAX}
                placeholder={strings.descriptionPlaceholder}
                aria-label={strings.description}
                className="text-2sm"
              />
            </div>
          ) : null}
        </Section>

        <Section>
          <div className="-mx-2 grid gap-1">
            <WhenField
              value={slot}
              onChange={changeSlot}
              timeZone={chapter.timeZone}
              locale={locale}
              language={language}
              strings={when}
            />

            <PlaceRow
              key={`origin-${chapter.id}`}
              icon={MapPin}
              value={origin}
              onChange={setOrigin}
              shortcut={home}
              shortcutHint={strings.chapterLocation}
              strings={placeStrings(strings.origin, strings.originPlaceholder)}
              clearLabel={strings.clearPlace}
              language={language}
              failed={errors.generic}
            />

            {functional ? (
              <>
                <PlaceRow
                  key={`destination-${chapter.id}`}
                  icon={Flag}
                  value={destination}
                  onChange={setDestination}
                  strings={placeStrings(
                    strings.destination,
                    strings.destinationPlaceholder,
                  )}
                  clearLabel={strings.clearPlace}
                  language={language}
                  failed={errors.generic}
                />
                {routeKey ? (
                  <RouteSummary
                    route={route}
                    loading={routeLoading}
                    template={strings.routeEta}
                    loadingLabel={strings.routeLoading}
                    failed={strings.routeFailed}
                    language={language}
                    notation={locale}
                    className="gap-3 px-2 text-2sm"
                  />
                ) : null}
              </>
            ) : null}

            {showMap ? (
              <div className="pr-2 pl-9">
                <LazyRideMap
                  pickup={coordsOf(origin)}
                  destination={functional ? coordsOf(destination) : null}
                  route={route?.path ?? null}
                  label={strings.mapLabel}
                  unavailable={strings.mapUnavailable}
                  className="h-30"
                />
              </div>
            ) : null}

            {functional ? (
              <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1.25 px-2">
                <Switch
                  id={roundTripId}
                  checked={roundTrip}
                  onCheckedChange={setRoundTrip}
                />
                <label
                  htmlFor={roundTripId}
                  className="text-2sm font-medium"
                  title={strings.roundTripHint}
                >
                  {strings.roundTrip}
                </label>
                {roundTrip ? (
                  <>
                    <label
                      htmlFor={stayId}
                      className="sr-only"
                    >
                      {strings.stay}
                    </label>
                    <NativeSelect
                      id={stayId}
                      value={stay}
                      onChange={(change) =>
                        setStay(Number(change.target.value))
                      }
                      className="h-8 border-line text-2sm"
                      size="sm"
                    >
                      {stays.map((option) => (
                        <NativeSelectOption
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <span className="text-2sm text-ink-soft">
                      {formatMessage(
                        strings.returnAt,
                        {
                          time: clockLabel(
                            clockToMinutes(slot.start) +
                              slot.durationMinutes +
                              stay,
                            locale,
                          ),
                        },
                        language,
                      )}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </Section>

        <Section className="gap-1.25">
          <FieldRow label={strings.trishaws}>
            <TrishawPicker
              loading={loading}
              options={options}
              selected={selected}
              free={free}
              picked={picked}
              max={limits.trishaws}
              onToggle={toggleTrishaw}
              single={pleasure}
              hint={pleasure ? strings.trishawsPleasure : strings.trishawsHint}
              count={people.count}
              language={language}
              strings={strings}
              labels={fleet}
            />
          </FieldRow>
          {pleasure ? null : (
            <FieldRow label={strings.pilotsNeeded}>
              <PilotsStepper
                value={pilotsNeeded}
                min={Math.max(1, pilotIds.length)}
                onChange={changePilotsNeeded}
                label={strings.pilotsNeeded}
                fewer={strings.fewerPilots}
                more={strings.morePilots}
              />
            </FieldRow>
          )}
          {event ? (
            <FieldRow
              label={strings.capacity}
              htmlFor={capacityId}
            >
              <Input
                ref={capacityField}
                id={capacityId}
                type="number"
                inputMode="numeric"
                min={Math.max(1, passengerIds.length)}
                max={RIDE_MAX_CAPACITY}
                value={capacity ?? ""}
                placeholder={strings.capacityPlaceholder}
                onChange={(change) => {
                  const raw = change.target.value;
                  if (raw === "") return setCapacity(null);
                  const parsed = parseCapacity(raw);
                  if (parsed !== null) setCapacity(parsed);
                }}
                onBlur={() =>
                  setCapacity((current) =>
                    current === null
                      ? null
                      : Math.max(current, passengerIds.length),
                  )
                }
                className={cn(
                  FIELD,
                  "shadow-none tabular-nums placeholder:text-ink-soft md:text-2sm",
                  capacity === null && "border-dashed",
                )}
              />
            </FieldRow>
          ) : null}
          <Suspense fallback={<CrewSkeleton />}>
            {crew ? (
              <CrewRows
                crew={crew}
                chapterId={chapter.id}
                passengerIds={passengerIds}
                onPassengers={setPassengerIds}
                pilotIds={pilotIds}
                onPilots={setPilotIds}
                passengerMax={limits.passengers}
                pilotMax={limits.pilots}
                passengerStrings={peopleStrings("passengers")}
                pilotStrings={peopleStrings("pilots")}
                language={language}
              />
            ) : (
              <CrewSkeleton />
            )}
          </Suspense>
        </Section>

        {event ? (
          <Section>
            <PhotoGallery
              kind="ridePhoto"
              upload={ridePhotoUpload}
              value={photoIds}
              onChange={setPhotoIds}
              alt={title || photos}
              labels={photoLabels}
              max={RIDE_MAX_PHOTOS}
              locale={language}
              sortable
            />
          </Section>
        ) : null}

        <Section className="gap-1.25">
          {noteOpen ? (
            <>
              <label
                htmlFor={noteId}
                className="flex items-center gap-1.5 text-2sm font-medium"
              >
                <NotebookPen
                  aria-hidden
                  className="size-4 text-ink-soft"
                />
                {strings.note}
              </label>
              <Textarea
                id={noteId}
                rows={3}
                autoFocus
                maxLength={RIDE_NOTE_MAX}
                placeholder={strings.notePlaceholder}
                value={note}
                onChange={(change) => setNote(change.target.value)}
                className="min-h-20 border-line text-2sm"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className={cn(FIELD, EMPTY_FIELD, "w-fit")}
            >
              <Plus
                aria-hidden
                className="size-4"
              />
              {strings.addNote}
            </button>
          )}
        </Section>
      </form>
    </AppDrawer>
  );
}

function Section({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ChapterPicker({
  chapters,
  value,
  onChange,
  label,
}: {
  chapters: ScheduleChapter[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const current = chapters.find((chapter) => chapter.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="-mx-1.5 inline-flex h-7 min-w-0 items-center gap-1 rounded-md px-1.5 font-medium text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none data-[state=open]:bg-canvas-deep"
        >
          <span className="truncate">{current?.name}</span>
          <ChevronDown
            aria-hidden
            className="size-3.5 shrink-0"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-48"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={onChange}
        >
          {chapters.map((chapter) => (
            <DropdownMenuRadioItem
              key={chapter.id}
              value={chapter.id}
              className="text-2sm"
            >
              {chapter.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlaceRow({
  icon: Icon,
  value,
  onChange,
  shortcut = null,
  shortcutHint = "",
  strings,
  clearLabel,
  language,
  failed,
}: {
  icon: typeof MapPin;
  value: Place | null;
  onChange: (place: Place | null) => void;
  shortcut?: Place | null;
  shortcutHint?: string;
  strings: Parameters<typeof PlaceSearch>[0]["strings"];
  clearLabel: string;
  language: Locale;
  failed: string;
}) {
  if (value)
    return (
      <div className="group flex min-h-9 items-center gap-3 rounded-lg px-2 py-1.5">
        <Icon
          aria-hidden
          className="size-4 shrink-0 text-ink-soft"
        />
        <PlaceValue
          name={value.name}
          address={value.address}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label={formatMessage(
            clearLabel,
            { place: value.name },
            language,
          )}
          className="size-8 shrink-0 text-ink-soft"
        >
          <X aria-hidden />
        </Button>
      </div>
    );

  return (
    <div className="flex min-h-9 items-center gap-3 px-2 py-1">
      <Icon
        aria-hidden
        className="size-4 shrink-0 text-ink-soft"
      />
      <div className="min-w-0 flex-1">
        <PlaceSearch
          address={null}
          language={language}
          strings={strings}
          failed={failed}
          variant="popover"
          shortcuts={
            shortcut
              ? [
                  {
                    id: "chapter",
                    name: shortcut.name,
                    hint: shortcutHint,
                    keywords: shortcut.address,
                    onPick: () => onChange(shortcut),
                  },
                ]
              : undefined
          }
          onPlace={(found) => onChange(placeFromResolved(found))}
        />
      </div>
    </div>
  );
}

function TrishawPicker({
  loading,
  options,
  selected,
  free,
  picked,
  max,
  onToggle,
  single,
  hint,
  count,
  language,
  strings,
  labels,
}: {
  loading: boolean;
  options: TrishawOption[] | null | undefined;
  selected: ReadonlySet<string>;
  free: ReadonlySet<string>;
  picked: string[];
  max: number | null;
  onToggle: (id: string, on: boolean) => void;
  single: boolean;
  hint: string;
  count: string;
  language: Locale;
  strings: Strings;
  labels: TrishawOptionLabels;
}) {
  const group = useId();
  const names = (options ?? [])
    .filter((option) => picked.includes(option.id))
    .map((option) => option.name);
  const summary = names.length ? names.join(", ") : strings.addTrishaws;
  const counter =
    max === null
      ? null
      : formatMessage(count, { count: picked.length, max }, language);

  const quiet = (text: string, busy = false) => (
    <p className="flex items-center gap-1.25 px-2 py-2 text-2sm text-ink-soft">
      {busy ? (
        <Spinner
          aria-hidden
          className="size-3.5"
        />
      ) : null}
      {text}
    </p>
  );

  const body = () => {
    if (options === undefined) return quiet(strings.trishawsLoading, true);
    if (options === null)
      return loading
        ? quiet(strings.trishawsLoading, true)
        : quiet(strings.trishawsFailed);
    if (options.length === 0)
      return loading
        ? quiet(strings.trishawsLoading, true)
        : quiet(strings.trishawsNone);
    return (
      <>
        <p className="px-2 pt-1 pb-1.25 text-xs text-ink-soft">{hint}</p>
        <ul
          aria-busy={loading}
          className={cn(
            "flex flex-col transition-opacity motion-reduce:transition-none",
            loading && "opacity-60",
          )}
        >
          {options.map((option) => (
            <TrishawOptionRow
              key={option.id}
              option={option}
              checked={selected.has(option.id) && free.has(option.id)}
              onCheckedChange={(on) => onToggle(option.id, on)}
              labels={labels}
              radioGroup={single ? group : undefined}
            />
          ))}
        </ul>
      </>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${strings.trishaws}: ${summary}${counter ? ` (${counter})` : ""}`}
          className={cn(FIELD, !names.length && EMPTY_FIELD)}
        >
          {loading && options ? (
            <Spinner
              aria-hidden
              className="size-4 shrink-0"
            />
          ) : names.length ? (
            <Bike
              aria-hidden
              className="size-4 shrink-0 text-ink-soft"
            />
          ) : (
            <Plus
              aria-hidden
              className="size-4 shrink-0"
            />
          )}
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          {counter ? (
            <span
              className={cn(
                "shrink-0 text-xs text-ink-soft tabular-nums",
                max !== null && picked.length >= max && "text-ink",
              )}
            >
              {counter}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={strings.trishaws}
        className="max-h-96 w-(--radix-popover-trigger-width) min-w-64 overflow-y-auto p-1"
      >
        {body()}
      </PopoverContent>
    </Popover>
  );
}

function PilotsStepper({
  value,
  min,
  onChange,
  label,
  fewer,
  more,
}: {
  value: number;
  min: number;
  onChange: (next: number) => void;
  label: string;
  fewer: string;
  more: string;
}) {
  const step = (by: number) => {
    onChange(value + by);
    haptics.selectionChanged();
  };
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 w-fit items-center rounded-lg border border-line text-2sm"
    >
      <button
        type="button"
        aria-label={fewer}
        disabled={value <= min}
        onClick={() => step(-1)}
        className={STEP_BUTTON}
      >
        <Minus
          aria-hidden
          className="size-3.5"
        />
      </button>
      <span
        aria-live="polite"
        className="min-w-8 text-center tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={more}
        disabled={value >= RIDE_MAX_PILOTS}
        onClick={() => step(1)}
        className={STEP_BUTTON}
      >
        <Plus
          aria-hidden
          className="size-3.5"
        />
      </button>
    </div>
  );
}

function CrewRows({
  crew,
  chapterId,
  passengerIds,
  onPassengers,
  pilotIds,
  onPilots,
  passengerMax,
  pilotMax,
  passengerStrings,
  pilotStrings,
  language,
}: {
  crew: Promise<ScheduleCrew>;
  chapterId: string;
  passengerIds: string[];
  onPassengers: (ids: string[]) => void;
  pilotIds: string[];
  onPilots: (ids: string[]) => void;
  passengerMax: number | null;
  pilotMax: number | null;
  passengerStrings: Parameters<typeof PeoplePicker>[0]["strings"];
  pilotStrings: Parameters<typeof PeoplePicker>[0]["strings"];
  language: Locale;
}) {
  const { passengers, pilots } = use(crew);
  const ofChapter = (people: CrewMember[]) =>
    people.filter((person) => person.chapterId === chapterId);

  return (
    <>
      <FieldRow label={passengerStrings.label}>
        <PeoplePicker
          options={ofChapter(passengers)}
          value={passengerIds}
          onChange={onPassengers}
          strings={passengerStrings}
          locale={language}
          max={passengerMax}
        />
      </FieldRow>
      <FieldRow label={pilotStrings.label}>
        <PeoplePicker
          options={ofChapter(pilots)}
          value={pilotIds}
          onChange={onPilots}
          strings={pilotStrings}
          locale={language}
          max={pilotMax}
        />
      </FieldRow>
    </>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3">
      {htmlFor ? (
        <label
          htmlFor={htmlFor}
          className="truncate text-2sm text-ink-soft"
        >
          {label}
        </label>
      ) : (
        <span
          aria-hidden
          className="truncate text-2sm text-ink-soft"
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

function CrewSkeleton() {
  return (
    <>
      {[0, 1].map((row) => (
        <div
          key={row}
          className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3"
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </>
  );
}
