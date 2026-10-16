"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { da, de, enGB, enUS } from "react-day-picker/locale";
import {
  Building2,
  Check,
  ChevronLeft,
  Flag,
  History,
  House,
  Loader2,
  MapPin,
  Search,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { toast } from "sonner";
import { notify } from "@/components/action-feedback";
import { AddressSearch } from "@/components/address-search";
import { StepDots, withStepLabel } from "@/components/step-dots";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { resolveAddress, suggestAddresses } from "@/features/profile/actions";
import type { RideLocationKind } from "@/features/ride-locations/schemas";
import {
  submitRideRequestAction,
  type RideRequestError,
} from "@/features/ride-requests/actions";
import {
  REQUEST_LIMITS,
  type RequestModel,
} from "@/features/ride-requests/schemas";
import { routeLine } from "@/features/ride-requests/components/request-words";
import {
  formatList,
  toIsoDateLocal,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { useKeyboardOpen } from "@/lib/native/keyboard";
import { cn } from "@/lib/utils";

type Place = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type RequestFormData = {
  chapterName: string;
  maxRiders: number;
  riders: {
    id: string;
    firstName: string;
    name: string;
    careCenterId: string | null;
    home: Place | null;
  }[];
  stranded: string[];
  locations: {
    id: string;
    name: string;
    address: string | null;
    kind: RideLocationKind;
  }[];
  destinations: Place[];
  days: {
    date: string;
    label: string;
    windows: { startMinute: number; endMinute: number; label: string }[];
  }[];
};

type Strings = Dictionary["passenger"]["request"];
type Step = "who" | "where" | "when" | "note" | "review";
type Start =
  | { kind: "location"; id: string }
  | { kind: "home" }
  | { kind: "place"; place: Place };
type Window = { startMinute: number; endMinute: number };

const WHEN_ERRORS: readonly RideRequestError[] = [
  "leadTime",
  "beyondHorizon",
  "closedDate",
  "outsideHours",
];

const CARD =
  "flex w-full items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none aria-checked:border-mint-deep aria-checked:bg-mint-tint disabled:pointer-events-none disabled:opacity-50";

const startValue = (start: Start | null) =>
  start === null
    ? ""
    : start.kind === "location"
      ? `location:${start.id}`
      : start.kind;

const asLocalDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const pickerLocale = (language: string, notation: Notation) =>
  language === "de"
    ? de
    : language === "da"
      ? da
      : notation === "en-US"
        ? enUS
        : enGB;

export function RideRequestForm({
  data,
  strings,
  address,
  errors,
  stepTemplate,
  language,
  notation,
}: {
  data: RequestFormData;
  strings: Strings;
  address: Dictionary["common"]["address"];
  errors: Record<string, string>;
  stepTemplate: string;
  language: Locale;
  notation: Notation;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyboardOpen = useKeyboardOpen();
  const [pending, startTransition] = useTransition();
  const pushed = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<Step | null>(null);
  const [typing, setTyping] = useState(false);

  const single = data.riders.length === 1;
  const steps: Step[] = single
    ? ["where", "when", "note", "review"]
    : ["who", "where", "when", "note", "review"];

  const [riderIds, setRiderIds] = useState<string[]>(
    single ? [data.riders[0].id] : [],
  );
  const [model, setModel] = useState<RequestModel | null>(null);
  const [start, setStart] = useState<Start | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Window | null>(null);
  const [note, setNote] = useState("");

  const chosen = data.riders.filter((rider) => riderIds.includes(rider.id));
  const lead = chosen[0] ?? data.riders[0];
  const home = lead.home;
  const careCenter = data.locations.find(
    (location) => location.id === lead.careCenterId,
  );

  const complete: Record<Step, boolean> = {
    who: riderIds.length > 0,
    where:
      model !== null &&
      start !== null &&
      (start.kind !== "home" || home !== null) &&
      (model === "pleasure" || destination !== null),
    when: date !== null && slot !== null,
    note: true,
    review: true,
  };
  const asked = searchParams.get("step") as Step | null;
  const requested = asked && steps.includes(asked) ? asked : steps[0];
  const blocking = steps.find(
    (step) => !complete[step] && steps.indexOf(step) < steps.indexOf(requested),
  );
  const step = blocking ?? requested;
  const index = steps.indexOf(step);

  const hrefFor = (next: Step) => {
    const params = new URLSearchParams(searchParams);
    params.set("step", next);
    return `?${params.toString()}`;
  };

  useEffect(() => {
    if (asked === null || asked === step) return;
    const params = new URLSearchParams(window.location.search);
    params.set("step", step);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [asked, step]);

  const goTo = (next: Step) => {
    pushed.current += 1;
    window.history.pushState(null, "", hrefFor(next));
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    if (pushed.current > 0) {
      pushed.current -= 1;
      window.history.back();
    } else if (index > 0) {
      window.history.replaceState(null, "", hrefFor(steps[index - 1]));
    } else if (window.history.length > 1) router.back();
    else router.replace("/passenger/rides", { transitionTypes: ["pop"] });
  };

  const pickModel = (next: RequestModel) => {
    setModel(next);
    if (next === "pleasure")
      setStart(
        careCenter
          ? { kind: "location", id: careCenter.id }
          : home
            ? { kind: "home" }
            : null,
      );
    else
      setStart(
        home
          ? { kind: "home" }
          : careCenter
            ? { kind: "location", id: careCenter.id }
            : null,
      );
  };

  const toggleRider = (id: string) =>
    setRiderIds((current) =>
      current.includes(id)
        ? current.filter((rider) => rider !== id)
        : current.length >= data.maxRiders
          ? current
          : [...current, id],
    );

  const pickup = (): Place | null =>
    start?.kind === "home"
      ? home
      : start?.kind === "place"
        ? start.place
        : null;

  const send = () =>
    startTransition(async () => {
      if (!model || !date || !slot) return;
      const result = await submitRideRequestAction({
        passengerIds: riderIds,
        model,
        rideLocationId: start?.kind === "location" ? start.id : null,
        pickup: pickup(),
        destination: model === "functional" ? destination : null,
        roundTrip: model === "functional" && roundTrip,
        window: { date, ...slot },
        note: note.trim() || null,
      });
      notify(result, {
        done: formatMessage(
          result.ok && result.rideId ? strings.booked : strings.sent,
          { chapter: data.chapterName },
          language,
        ),
        errors: { generic: errors.generic, ...errors },
      });
      if (!result.ok) {
        if (WHEN_ERRORS.includes(result.error)) {
          setSlot(null);
          goTo("when");
          router.refresh();
        }
        return;
      }
      router.replace(`/passenger/rides/requests/${result.id}`, {
        transitionTypes: ["push"],
      });
    });

  useEffect(() => {
    if (shown.current !== null && shown.current !== step)
      heading.current?.focus({ preventScroll: true });
    shown.current = step;
  }, [step]);

  const copy = strings.steps[step];
  const progress = withStepLabel(
    { index, total: steps.length },
    stepTemplate,
    language,
  );
  const last = step === "review";

  return (
    <div
      className="flex flex-1 flex-col gap-6 pb-24 md:pb-0"
      onFocusCapture={(event) =>
        setTyping(event.target instanceof HTMLInputElement)
      }
      onBlurCapture={() => setTyping(false)}
    >
      <div className="relative flex min-h-11 items-center justify-center">
        <button
          type="button"
          onClick={back}
          aria-label={strings.back}
          className="absolute left-0 -ml-2 flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
        >
          <ChevronLeft
            aria-hidden
            className="size-5"
          />
        </button>
        <StepDots {...progress} />
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {data.chapterName}
        </p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-2xl tracking-tight focus:outline-none md:text-3xl"
        >
          {copy.title}
        </h1>
        <p className="text-ink-soft">
          {formatMessage(
            copy.body,
            {
              count: data.maxRiders,
              chapter: data.chapterName,
              riders: chosen.map((rider) => rider.firstName).join(" & "),
            },
            language,
          )}
        </p>
      </header>

      {step === "who" ? (
        <WhoStep
          riders={data.riders}
          stranded={data.stranded}
          chosen={riderIds}
          max={data.maxRiders}
          onToggle={toggleRider}
          onPick={(id) => setRiderIds([id])}
          strings={strings}
          chapter={data.chapterName}
          language={language}
        />
      ) : null}

      {step === "where" ? (
        <WhereStep
          model={model}
          onModel={pickModel}
          start={start}
          onStart={setStart}
          destination={destination}
          onDestination={setDestination}
          roundTrip={roundTrip}
          onRoundTrip={setRoundTrip}
          home={home}
          careCenterId={careCenter?.id ?? null}
          locations={data.locations}
          destinations={data.destinations}
          strings={strings}
          address={address}
          language={language}
        />
      ) : null}

      {step === "when" ? (
        <WhenStep
          days={data.days}
          date={date}
          onDate={(next) => {
            setDate(next);
            setSlot(null);
          }}
          slot={slot}
          onSlot={setSlot}
          strings={strings}
          language={language}
          notation={notation}
        />
      ) : null}

      {step === "note" ? (
        <NoteStep
          value={note}
          onChange={setNote}
          strings={strings}
        />
      ) : null}

      {step === "review" && model && date && slot ? (
        <ReviewStep
          rows={[
            ...(single
              ? []
              : [
                  {
                    label: strings.review.riders,
                    value: chosen.map((rider) => rider.name).join(", "),
                    step: "who" as const,
                  },
                ]),
            {
              label: strings.review.ride,
              value: routeLine(
                strings.models[model],
                placeName(start, home, data.locations),
                model === "functional" ? (destination?.name ?? null) : null,
                model === "functional" && roundTrip
                  ? strings.where.roundTrip
                  : null,
              ),
              step: "where" as const,
            },
            {
              label: strings.review.when,
              value: [
                data.days.find((day) => day.date === date)?.label,
                data.days
                  .find((day) => day.date === date)
                  ?.windows.find(
                    (candidate) =>
                      candidate.startMinute === slot.startMinute &&
                      candidate.endMinute === slot.endMinute,
                  )?.label,
              ]
                .filter(Boolean)
                .join(", "),
              step: "when" as const,
            },
            {
              label: strings.review.note,
              value: note.trim() || strings.review.noNote,
              step: "note" as const,
            },
          ]}
          onEdit={goTo}
          strings={strings}
          chapter={data.chapterName}
          language={language}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-x-0 z-30 flex justify-center px-4 md:static md:mt-auto md:px-0",
          typing && "max-md:hidden",
          keyboardOpen
            ? "bottom-[calc(var(--keyboard-inset,0px)+0.75rem)]"
            : "bottom-above-tabbar",
        )}
      >
        <Button
          type="button"
          variant="brand"
          size="hero"
          className="max-w-md md:max-w-none"
          disabled={!complete[step] || pending}
          onClick={() => (last ? send() : goTo(steps[index + 1]))}
        >
          {pending ? (
            <Loader2
              aria-hidden
              className="animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {last ? (pending ? strings.sending : strings.send) : strings.next}
        </Button>
      </div>
    </div>
  );
}

function placeName(
  start: Start | null,
  home: Place | null,
  locations: RequestFormData["locations"],
) {
  if (!start) return null;
  if (start.kind === "home") return home?.name ?? null;
  if (start.kind === "place") return start.place.name;
  return locations.find((location) => location.id === start.id)?.name ?? null;
}

function RiderMark({ on, name }: { on: boolean; name: string }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border border-line",
          on && "border-mint-deep bg-mint-deep text-white",
        )}
      >
        {on ? <Check className="size-4" /> : null}
      </span>
      <span className="text-base font-medium">{name}</span>
    </>
  );
}

function WhoStep({
  riders,
  stranded,
  chosen,
  max,
  onToggle,
  onPick,
  strings,
  chapter,
  language,
}: {
  riders: RequestFormData["riders"];
  stranded: string[];
  chosen: string[];
  max: number;
  onToggle: (id: string) => void;
  onPick: (id: string) => void;
  strings: Strings;
  chapter: string;
  language: Locale;
}) {
  return (
    <div className="flex flex-col gap-3">
      {max === 1 ? (
        <RadioGroupPrimitive.Root
          aria-label={strings.steps.who.title}
          value={chosen[0] ?? ""}
          onValueChange={onPick}
          className="flex flex-col gap-3"
        >
          {riders.map((rider) => (
            <RadioGroupPrimitive.Item
              key={rider.id}
              value={rider.id}
              className={cn(CARD, "items-center")}
            >
              <RiderMark
                on={chosen.includes(rider.id)}
                name={rider.name}
              />
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      ) : (
        <div
          role="group"
          aria-label={strings.steps.who.title}
          className="flex flex-col gap-3"
        >
          {riders.map((rider) => {
            const on = chosen.includes(rider.id);
            return (
              <button
                key={rider.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!on && chosen.length >= max}
                onClick={() => onToggle(rider.id)}
                className={cn(CARD, "items-center")}
              >
                <RiderMark
                  on={on}
                  name={rider.name}
                />
              </button>
            );
          })}
        </div>
      )}
      {stranded.length ? (
        <p className="text-2sm text-ink-soft">
          {formatMessage(
            strings.who.stranded,
            { names: formatList(stranded, wordsLocale(language)), chapter },
            language,
          )}
        </p>
      ) : null}
    </div>
  );
}

function CardBody({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body?: string | null;
}) {
  return (
    <>
      <Icon
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-soft"
      />
      <span className="grid min-w-0 gap-0.5">
        <span className="font-medium">{title}</span>
        {body ? (
          <span className="text-2sm text-pretty text-ink-soft">{body}</span>
        ) : null}
      </span>
    </>
  );
}

function ChoiceCard({
  value,
  ...body
}: {
  value: string;
  icon: LucideIcon;
  title: string;
  body?: string | null;
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={CARD}
    >
      <CardBody {...body} />
    </RadioGroupPrimitive.Item>
  );
}

function Group({
  label,
  value,
  onValue,
  children,
  after,
}: {
  label: string;
  value: string;
  onValue: (value: string) => void;
  children: ReactNode;
  after?: ReactNode;
}) {
  const id = useId();
  return (
    <section className="flex flex-col gap-3">
      <h2
        id={id}
        className="text-xs font-semibold tracking-wide text-ink-soft uppercase"
      >
        {label}
      </h2>
      <RadioGroupPrimitive.Root
        aria-labelledby={id}
        value={value}
        onValueChange={onValue}
        className="flex flex-col gap-3"
      >
        {children}
      </RadioGroupPrimitive.Root>
      {after}
    </section>
  );
}

function PlaceSearch({
  strings,
  address,
  language,
  onPlace,
  autoFocus,
}: {
  strings: Strings;
  address: Dictionary["common"]["address"];
  language: Locale;
  onPlace: (place: Place) => void;
  autoFocus?: boolean;
}) {
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const [resolving, setResolving] = useState(false);

  const pick = (mapboxId: string, name: string) => {
    setResolving(true);
    void resolveAddress({ mapboxId, sessionToken }).then((place) => {
      setResolving(false);
      if (!place) {
        haptics.error();
        toast.error(strings.where.searchFailed);
        return;
      }
      onPlace({
        name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    });
  };

  if (resolving)
    return (
      <p className="flex h-11 items-center gap-2 px-1 text-sm text-ink-soft">
        <Loader2
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
        {address.searching}
      </p>
    );

  return (
    <AddressSearch
      search={(query) => suggestAddresses({ query, sessionToken, language })}
      strings={{
        label: strings.where.searchLabel,
        placeholder: address.placeholder,
        hint: strings.where.searchHint,
        searching: address.searching,
        noResults: address.noResults,
      }}
      onPick={(suggestion) => pick(suggestion.id, suggestion.name)}
      autoFocus={autoFocus}
    />
  );
}

function PickedPlace({
  icon: Icon,
  place,
  change,
  onChange,
}: {
  icon: LucideIcon;
  place: Place;
  change: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(CARD, "border-mint-deep bg-mint-tint")}
    >
      <Icon
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-ink-soft"
      />
      <span className="grid min-w-0 gap-0.5">
        <span className="font-medium">{place.name}</span>
        <span className="text-2sm text-ink-soft">
          {[place.address, change].filter(Boolean).join(" · ")}
        </span>
      </span>
    </button>
  );
}

function WhereStep({
  model,
  onModel,
  start,
  onStart,
  destination,
  onDestination,
  roundTrip,
  onRoundTrip,
  home,
  careCenterId,
  locations,
  destinations,
  strings,
  address,
  language,
}: {
  model: RequestModel | null;
  onModel: (model: RequestModel) => void;
  start: Start | null;
  onStart: (start: Start) => void;
  destination: Place | null;
  onDestination: (place: Place | null) => void;
  roundTrip: boolean;
  onRoundTrip: (on: boolean) => void;
  home: Place | null;
  careCenterId: string | null;
  locations: RequestFormData["locations"];
  destinations: Place[];
  strings: Strings;
  address: Dictionary["common"]["address"];
  language: Locale;
}) {
  const roundTripId = useId();
  const [searching, setSearching] = useState(false);
  const [custom, setCustom] = useState<Place | null>(
    start?.kind === "place" ? start.place : null,
  );
  const where = strings.where;
  const ordered = [
    ...locations.filter((location) => location.id === careCenterId),
    ...locations.filter((location) => location.id !== careCenterId),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Group
        label={where.kind}
        value={model ?? ""}
        onValue={(next) => onModel(next as RequestModel)}
      >
        <ChoiceCard
          value="pleasure"
          icon={Wind}
          title={strings.models.pleasure}
          body={where.pleasureBody}
        />
        <ChoiceCard
          value="functional"
          icon={Flag}
          title={strings.models.functional}
          body={where.functionalBody}
        />
      </Group>

      {model ? (
        <Group
          label={model === "pleasure" ? where.from : where.pickup}
          value={startValue(start)}
          onValue={(next) => {
            setSearching(false);
            if (next === "home") onStart({ kind: "home" });
            else if (next === "place" && custom)
              onStart({ kind: "place", place: custom });
            else onStart({ kind: "location", id: next.slice(9) });
          }}
          after={
            searching ? (
              <PlaceSearch
                strings={strings}
                address={address}
                language={language}
                autoFocus
                onPlace={(place) => {
                  setSearching(false);
                  setCustom(place);
                  onStart({ kind: "place", place });
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setSearching(true)}
                className={CARD}
              >
                <CardBody
                  icon={Search}
                  title={where.elsewhere}
                  body={where.elsewhereBody}
                />
              </button>
            )
          }
        >
          {ordered.map((location) => (
            <ChoiceCard
              key={location.id}
              value={`location:${location.id}`}
              icon={location.kind === "publicPlace" ? MapPin : Building2}
              title={location.name}
              body={
                location.id === careCenterId
                  ? where.careCenter
                  : (location.address ?? where.kinds[location.kind])
              }
            />
          ))}
          {home ? (
            <ChoiceCard
              value="home"
              icon={House}
              title={where.home}
              body={home.address}
            />
          ) : null}
          {custom ? (
            <ChoiceCard
              value="place"
              icon={MapPin}
              title={custom.name}
              body={custom.address}
            />
          ) : null}
        </Group>
      ) : null}

      {model === "functional" ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {where.to}
          </h2>
          {destination ? (
            <PickedPlace
              icon={Flag}
              place={destination}
              change={where.change}
              onChange={() => onDestination(null)}
            />
          ) : (
            <>
              <PlaceSearch
                strings={strings}
                address={address}
                language={language}
                onPlace={onDestination}
              />
              {destinations.length ? (
                <div className="flex flex-col gap-2">
                  <p className="text-2sm text-ink-soft">{where.previous}</p>
                  <ul className="flex flex-wrap gap-2">
                    {destinations.map((place) => (
                      <li key={`${place.name}|${place.address ?? ""}`}>
                        <button
                          type="button"
                          onClick={() => onDestination(place)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
                        >
                          <History
                            aria-hidden
                            className="size-4 text-ink-soft"
                          />
                          {place.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
          <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
            <label
              htmlFor={roundTripId}
              className="grid gap-0.5"
            >
              <span className="font-medium">{where.roundTrip}</span>
              <span className="text-2sm text-ink-soft">
                {where.roundTripHint}
              </span>
            </label>
            <Switch
              id={roundTripId}
              checked={roundTrip}
              onCheckedChange={onRoundTrip}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WhenStep({
  days,
  date,
  onDate,
  slot,
  onSlot,
  strings,
  language,
  notation,
}: {
  days: RequestFormData["days"];
  date: string | null;
  onDate: (date: string) => void;
  slot: Window | null;
  onSlot: (slot: Window) => void;
  strings: Strings;
  language: Locale;
  notation: Notation;
}) {
  const open = useMemo(() => new Set(days.map((day) => day.date)), [days]);
  const day = days.find((candidate) => candidate.date === date) ?? null;

  if (!days.length)
    return (
      <p className="rounded-2xl bg-canvas-deep p-4 text-sm text-ink-soft">
        {strings.when.none}
      </p>
    );

  const firstDay = asLocalDate(days[0].date);
  const lastDay = asLocalDate(days[days.length - 1].date);

  return (
    <div className="flex flex-col gap-6">
      <Calendar
        mode="single"
        selected={date ? asLocalDate(date) : undefined}
        defaultMonth={date ? asLocalDate(date) : firstDay}
        startMonth={firstDay}
        endMonth={lastDay}
        onSelect={(picked) => {
          if (!picked) return;
          haptics.selectionChanged();
          onDate(toIsoDateLocal(picked));
        }}
        disabled={(candidate) => !open.has(toIsoDateLocal(candidate))}
        locale={pickerLocale(language, notation)}
        weekStartsOn={1}
        showOutsideDays={false}
        className="self-start rounded-2xl border border-line p-3 [--cell-size:--spacing(11)] [&_button[data-selected-single=true]]:bg-mint-deep [&_button[data-selected-single=true]]:text-white"
      />

      {day ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {formatMessage(strings.when.windows, { date: day.label }, language)}
          </h2>
          <RadioGroupPrimitive.Root
            aria-label={day.label}
            value={slot ? `${slot.startMinute}-${slot.endMinute}` : ""}
            onValueChange={(next) => {
              const [startMinute, endMinute] = next.split("-").map(Number);
              haptics.selectionChanged();
              onSlot({ startMinute, endMinute });
            }}
            className="flex flex-wrap gap-2"
          >
            {day.windows.map((candidate) => (
              <RadioGroupPrimitive.Item
                key={`${candidate.startMinute}-${candidate.endMinute}`}
                value={`${candidate.startMinute}-${candidate.endMinute}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm tabular-nums transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none aria-checked:border-mint-deep aria-checked:bg-mint-deep aria-checked:text-white aria-checked:hover:bg-mint-deep"
              >
                {candidate.label}
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroupPrimitive.Root>
          <p className="text-2sm text-ink-soft">{strings.when.confirm}</p>
        </section>
      ) : (
        <p className="text-2sm text-ink-soft">{strings.when.pickDay}</p>
      )}
    </div>
  );
}

function NoteStep({
  value,
  onChange,
  strings,
}: {
  value: string;
  onChange: (value: string) => void;
  strings: Strings;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-sm font-medium"
      >
        {strings.note.label}
      </label>
      <Textarea
        id={id}
        rows={5}
        maxLength={REQUEST_LIMITS.note}
        placeholder={strings.note.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-32 rounded-2xl border-line text-base"
      />
    </div>
  );
}

function ReviewStep({
  rows,
  onEdit,
  strings,
  chapter,
  language,
}: {
  rows: { label: string; value: string; step: Step }[];
  onEdit: (step: Step) => void;
  strings: Strings;
  chapter: string;
  language: Locale;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 px-4 py-3"
          >
            <div className="grid min-w-0 flex-1 gap-0.5">
              <dt className="text-2sm text-ink-soft">{row.label}</dt>
              <dd className="break-words">{row.value}</dd>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 shrink-0 text-ink-soft"
              onClick={() => onEdit(row.step)}
            >
              {strings.review.change}
            </Button>
          </div>
        ))}
      </dl>
      <p className="rounded-2xl bg-mint-tint p-4 text-sm text-pretty">
        {formatMessage(strings.review.waiting, { chapter }, language)}
      </p>
    </div>
  );
}
