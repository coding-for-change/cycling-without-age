"use client";

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  availableTrishawsAction,
  scheduleRideAction,
} from "@/features/rides/actions";
import type { TrishawOption } from "@/features/rides/components/trishaw-options";
import {
  RIDE_MAX_PILOTS,
  RIDE_MODELS,
  RIDE_NOTE_MAX,
  type RideModelName,
} from "@/features/rides/schemas";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatTime, type Locale as NotationLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { ResolvedPlace } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import { PlaceSearch } from "../../_components/place-search";
import {
  TrishawOptionRow,
  type TrishawOptionLabels,
} from "./trishaw-option-row";

export type ScheduleChapter = {
  id: string;
  name: string;
  timeZone: string;
  date: string;
  start: string;
};

type Choice = { value: number; label: string };

type Strings = Dictionary["rides"]["schedule"];

type FleetLabels = TrishawOptionLabels & {
  selected: string;
  nothingSelected: string;
};

type Place = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type Props = {
  chapters: ScheduleChapter[];
  durations: Choice[];
  stays: Choice[];
  locale: NotationLocale;
  language: Locale;
  strings: Strings;
  models: Dictionary["calendar"]["models"];
  errors: Dictionary["rides"]["errors"];
  fleet: FleetLabels;
};

const DEFAULT_MINUTES = 60;
const LOOKUP_DELAY_MS = 250;
const PILOT_COUNTS = Array.from({ length: RIDE_MAX_PILOTS }, (_, i) => i + 1);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const toPlace = (found: ResolvedPlace): Place => ({
  name: found.poiName ?? found.address.split(",")[0].trim(),
  address: found.address,
  latitude: found.coords.lat,
  longitude: found.coords.lng,
});

function clockAfter(start: string, minutes: number, locale: NotationLocale) {
  const [hour, minute] = start.split(":").map(Number);
  const wall = Date.UTC(2000, 0, 1, hour, minute + minutes);
  return formatTime(new Date(wall), locale, "UTC");
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
  durations,
  stays,
  locale,
  language,
  strings,
  models,
  errors,
  fleet,
}: Props & { open: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { close } = useDrawerParam();
  const formId = useId();
  const chapterFieldId = useId();
  const dateId = useId();
  const startId = useId();
  const durationId = useId();
  const roundTripId = useId();
  const stayId = useId();
  const pilotsId = useId();
  const noteId = useId();
  const modelLabelId = useId();
  const trishawsLabelId = useId();
  const [pending, startTransition] = useTransition();

  const [chapterId, setChapterId] = useState(chapters[0].id);
  const chapter =
    chapters.find((candidate) => candidate.id === chapterId) ?? chapters[0];
  const [model, setModel] = useState<RideModelName>("event");
  const [date, setDate] = useState(chapter.date);
  const [start, setStart] = useState(chapter.start);
  const [duration, setDuration] = useState(DEFAULT_MINUTES);
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [stay, setStay] = useState(DEFAULT_MINUTES);
  const [pilots, setPilots] = useState(1);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<{
    key: string;
    options: TrishawOption[] | null;
  } | null>(null);

  const functional = model === "functional";
  const twoWay = functional && roundTrip;
  const slotReady = DATE.test(date) && TIME.test(start);
  const lookup = slotReady
    ? JSON.stringify({
        chapterId: chapter.id,
        slot: { date, start, durationMinutes: duration },
        roundTrip: twoWay,
        stayMinutes: twoWay ? stay : 0,
      })
    : null;
  const request = lookup ? `${attempt}:${lookup}` : null;

  useEffect(() => {
    if (!open || !lookup || !request) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await availableTrishawsAction(JSON.parse(lookup)).catch(
        () => null,
      );
      if (!live) return;
      const options = result?.ok ? result.options : null;
      setFetched({ key: request, options });
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
  }, [open, lookup, request]);

  const loading = request !== null && fetched?.key !== request;
  const options = fetched?.options;
  const free = new Set(
    (options ?? [])
      .filter((option) => option.blocked === null)
      .map((option) => option.id),
  );
  const picked = options
    ? [...selected].filter((id) => free.has(id))
    : [...selected];

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const pickChapter = (id: string) => {
    setChapterId(id);
    setSelected(new Set());
    setOrigin(null);
    setDestination(null);
  };

  const detailHref = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    const query = params.toString();
    return query ? `/admin/rides/${id}?${query}` : `/admin/rides/${id}`;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const trimmed = note.trim();
    startTransition(async () => {
      const result = await scheduleRideAction({
        chapterId: chapter.id,
        model,
        slot: { date, start, durationMinutes: duration },
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
        requiredPilots: pilots,
        note: trimmed || null,
      });
      notify(result, {
        done: twoWay ? strings.scheduledRoundTrip : strings.scheduled,
        errors,
      });
      if (result.ok) router.replace(detailHref(result.id));
    });
  };

  const placeStrings = (label: string, placeholder: string) => ({
    label,
    placeholder,
    hint: strings.placeHint,
    searching: strings.placeSearching,
    noResults: strings.placeNoResults,
  });

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) close();
      }}
      dismissible={!pending}
      title={strings.title}
      description={formatMessage(
        strings.timeZone,
        { zone: chapter.timeZone.replace(/_/g, " ") },
        language,
      )}
      footer={
        <>
          {options?.length || picked.length ? (
            <p
              aria-live="polite"
              className="text-2sm text-ink-soft mr-auto"
            >
              {picked.length === 0
                ? fleet.nothingSelected
                : formatMessage(
                    fleet.selected,
                    { count: picked.length },
                    language,
                  )}
            </p>
          ) : null}
          <Button
            type="submit"
            form={formId}
            disabled={pending}
            variant="brand"
            className="min-h-11"
          >
            {pending ? strings.submitting : strings.submit}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={submit}
        onKeyDown={submitOnCmdEnter}
        aria-busy={pending}
        className="grid gap-5"
      >
        {chapters.length > 1 ? (
          <Field className="[&_[data-slot=native-select-wrapper]]:w-full">
            <FieldLabel htmlFor={chapterFieldId}>{strings.chapter}</FieldLabel>
            <NativeSelect
              id={chapterFieldId}
              value={chapter.id}
              onChange={(event) => pickChapter(event.target.value)}
              className="border-line h-11 text-base"
            >
              {chapters.map((option) => (
                <NativeSelectOption
                  key={option.id}
                  value={option.id}
                >
                  {option.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}

        <div className="grid gap-2">
          <span
            id={modelLabelId}
            className="text-sm font-medium"
          >
            {strings.model}
          </span>
          <div
            role="group"
            aria-labelledby={modelLabelId}
            className="flex flex-wrap gap-2"
          >
            {RIDE_MODELS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={model === option}
                onClick={() => setModel(option)}
                className={cn(
                  "focus-visible:ring-ink min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
                  model === option
                    ? "border-mint-deep bg-mint-deep text-white"
                    : "border-line bg-canvas hover:bg-canvas-deep",
                )}
              >
                {models[option]}
              </button>
            ))}
          </div>
          <p
            aria-live="polite"
            className="text-2sm text-ink-soft"
          >
            {strings.modelHints[model]}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor={dateId}>{strings.date}</FieldLabel>
            <Input
              id={dateId}
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="border-line h-11 text-base"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={startId}>{strings.start}</FieldLabel>
            <Input
              id={startId}
              type="time"
              required
              step={300}
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="border-line h-11 text-base"
            />
          </Field>
          <Field className="[&_[data-slot=native-select-wrapper]]:w-full">
            <FieldLabel htmlFor={durationId}>{strings.duration}</FieldLabel>
            <NativeSelect
              id={durationId}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="border-line h-11 text-base"
            >
              {durations.map((option) => (
                <NativeSelectOption
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <PlaceField
          key={`origin-${chapter.id}`}
          label={strings.origin}
          value={origin}
          onChange={setOrigin}
          strings={placeStrings(strings.origin, strings.originPlaceholder)}
          clearLabel={strings.clearPlace}
          language={language}
          failed={errors.generic}
        />

        {functional ? (
          <>
            <PlaceField
              key={`destination-${chapter.id}`}
              label={strings.destination}
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

            <div className="flex min-h-11 items-start gap-3">
              <Switch
                id={roundTripId}
                checked={roundTrip}
                onCheckedChange={setRoundTrip}
              />
              <label
                htmlFor={roundTripId}
                className="grid gap-1"
              >
                <span className="text-sm leading-none font-medium">
                  {strings.roundTrip}
                </span>
                <span className="text-2sm text-ink-soft">
                  {strings.roundTripHint}
                </span>
              </label>
            </div>

            {roundTrip ? (
              <Field className="[&_[data-slot=native-select-wrapper]]:w-full">
                <FieldLabel htmlFor={stayId}>{strings.stay}</FieldLabel>
                <NativeSelect
                  id={stayId}
                  value={stay}
                  onChange={(event) => setStay(Number(event.target.value))}
                  className="border-line h-11 text-base"
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
                {TIME.test(start) ? (
                  <FieldDescription>
                    {formatMessage(
                      strings.returnAt,
                      { time: clockAfter(start, duration + stay, locale) },
                      language,
                    )}
                  </FieldDescription>
                ) : null}
              </Field>
            ) : null}
          </>
        ) : null}

        <section
          aria-labelledby={trishawsLabelId}
          aria-busy={loading}
          className="grid gap-2"
        >
          <div className="flex items-center gap-2">
            <span
              id={trishawsLabelId}
              className="text-sm font-medium"
            >
              {strings.trishaws}
            </span>
            {loading && options ? (
              <Loader2
                aria-hidden
                className="text-ink-faint size-3.5 animate-spin motion-reduce:animate-none"
              />
            ) : null}
          </div>
          <TrishawList
            lookup={lookup}
            loading={loading}
            options={options}
            selected={selected}
            free={free}
            onToggle={toggle}
            onRetry={() => setAttempt((count) => count + 1)}
            strings={strings}
            labels={fleet}
          />
        </section>

        <Field className="[&_[data-slot=native-select-wrapper]]:w-full">
          <FieldLabel htmlFor={pilotsId}>{strings.pilots}</FieldLabel>
          <NativeSelect
            id={pilotsId}
            value={pilots}
            onChange={(event) => setPilots(Number(event.target.value))}
            className="border-line h-11 text-base"
          >
            {PILOT_COUNTS.map((count) => (
              <NativeSelectOption
                key={count}
                value={count}
              >
                {count}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor={noteId}>
            {strings.note}
            <span className="text-ink-soft font-normal">
              {strings.optional}
            </span>
          </FieldLabel>
          <Textarea
            id={noteId}
            rows={3}
            maxLength={RIDE_NOTE_MAX}
            placeholder={strings.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="border-line min-h-24 text-base"
          />
        </Field>
      </form>
    </AppDrawer>
  );
}

function PlaceField({
  label,
  value,
  onChange,
  strings,
  clearLabel,
  language,
  failed,
}: {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  strings: Parameters<typeof PlaceSearch>[0]["strings"];
  clearLabel: string;
  language: Locale;
  failed: string;
}) {
  return (
    <div className="grid gap-2">
      <span
        aria-hidden
        className="text-sm font-medium"
      >
        {label}
      </span>
      {value ? (
        <div className="border-line bg-mint-tint flex min-h-14 items-center gap-3 rounded-(--r-card) border px-3 py-2">
          <MapPin
            aria-hidden
            className="text-mint-deep size-5 shrink-0"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{value.name}</span>
            {value.address !== value.name ? (
              <span className="text-2sm text-ink-soft truncate">
                {value.address}
              </span>
            ) : null}
          </span>
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
            className="size-11 shrink-0"
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <PlaceSearch
          address={null}
          language={language}
          strings={strings}
          failed={failed}
          onPlace={(found) => onChange(toPlace(found))}
        />
      )}
    </div>
  );
}

function TrishawList({
  lookup,
  loading,
  options,
  selected,
  free,
  onToggle,
  onRetry,
  strings,
  labels,
}: {
  lookup: string | null;
  loading: boolean;
  options: TrishawOption[] | null | undefined;
  selected: ReadonlySet<string>;
  free: ReadonlySet<string>;
  onToggle: (id: string, on: boolean) => void;
  onRetry: () => void;
  strings: Strings;
  labels: TrishawOptionLabels;
}) {
  const quiet = (text: string, busy = false) => (
    <p className="text-2sm text-ink-soft flex items-center gap-1.25">
      {busy ? (
        <Loader2
          aria-hidden
          className="size-3.5 animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {text}
    </p>
  );

  if (!lookup) return quiet(strings.trishawsWaiting);
  if (options === undefined) return quiet(strings.trishawsLoading, true);
  if (options === null)
    return loading ? (
      quiet(strings.trishawsLoading, true)
    ) : (
      <div className="flex flex-wrap items-center gap-3">
        {quiet(strings.trishawsFailed)}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          {strings.retry}
        </Button>
      </div>
    );
  if (options.length === 0)
    return loading
      ? quiet(strings.trishawsLoading, true)
      : quiet(strings.trishawsNone);

  return (
    <>
      <p className="text-2sm text-ink-soft">{strings.trishawsHint}</p>
      <ul
        className={cn(
          "-mx-2 flex flex-col transition-opacity motion-reduce:transition-none",
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
          />
        ))}
      </ul>
    </>
  );
}
