"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type Ref,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Check,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { resolveAddress, suggestAddresses } from "@/features/profile/actions";
import {
  changeRideRequestAction,
  submitRideRequestAction,
} from "@/features/ride-requests/actions";
import { rescheduleRideAction } from "../../actions";
import {
  REQUEST_LIMITS,
  type RequestModel,
} from "@/features/ride-requests/schemas";
import { routeLine } from "@/features/ride-requests/components/request-words";
import { formatList, wordsLocale, type Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { useKeyboardOpen } from "@/lib/native/keyboard";
import { cn } from "@/lib/utils";
import { RoutePreview } from "./route-preview";

type Place = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type RequestFormData = {
  chapterName: string;
  automatic: boolean;
  closedDays: Record<string, string>;
  outsideDays: string;
  maxRiders: number;
  riders: {
    id: string;
    firstName: string;
    name: string;
    atCareHome: boolean;
    home: Place | null;
  }[];
  stranded: string[];
  careHome: Place & { named: boolean };
  destinations: Place[];
  prefill?: RequestPrefill | null;
  days: {
    date: string;
    label: string;
    windows: { startMinute: number; endMinute: number; label: string }[];
  }[];
};

export type RequestStart =
  { kind: "careHome" } | { kind: "home" } | { kind: "place"; place: Place };

export type RequestPrefill = {
  source: { kind: "ride" | "request"; id: string };
  label: string;
  riderIds: string[];
  model: RequestModel;
  start: RequestStart | null;
  destination: Place | null;
  roundTrip: boolean;
  window: { date: string; startMinute: number; endMinute: number } | null;
  note: string | null;
};

type Strings = Dictionary["passenger"]["request"];
type Step = "who" | "where" | "when" | "note" | "review";
type Start = RequestStart;
type Window = { startMinute: number; endMinute: number };

const WHEN_ERRORS: readonly string[] = [
  "leadTime",
  "beyondHorizon",
  "closedDate",
  "outsideHours",
];

const CARD =
  "flex w-full items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-left transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none aria-checked:border-mint-deep aria-checked:bg-mint-tint disabled:pointer-events-none disabled:opacity-50";

const startValue = (start: Start | null) => start?.kind ?? "";

export function RideRequestForm({
  data,
  strings,
  address,
  route,
  dateTime,
  errors,
  stepTemplate,
  language,
  notation,
}: {
  data: RequestFormData;
  strings: Strings;
  address: Dictionary["common"]["address"];
  route: Dictionary["common"]["route"];
  dateTime: string;
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
  const prefill = data.prefill ?? null;

  const [riderIds, setRiderIds] = useState<string[]>(
    prefill?.riderIds.length
      ? prefill.riderIds
      : single
        ? [data.riders[0].id]
        : [],
  );
  const [model, setModel] = useState<RequestModel | null>(
    prefill?.model ?? null,
  );
  const [start, setStart] = useState<Start | null>(prefill?.start ?? null);
  const [startPicked, setStartPicked] = useState(Boolean(prefill?.start));
  const [destination, setDestination] = useState<Place | null>(
    prefill?.destination ?? null,
  );
  const [roundTrip, setRoundTrip] = useState(prefill?.roundTrip ?? true);
  const [date, setDate] = useState<string | null>(
    prefill?.window?.date ?? null,
  );
  const [slot, setSlot] = useState<Window | null>(
    prefill?.window
      ? {
          startMinute: prefill.window.startMinute,
          endMinute: prefill.window.endMinute,
        }
      : null,
  );
  const [note, setNote] = useState(prefill?.note ?? "");

  const chosen = data.riders.filter((rider) => riderIds.includes(rider.id));
  const lead = chosen[0] ?? data.riders[0];
  const home = lead.home;
  const careHome =
    data.careHome.named || lead.atCareHome ? data.careHome : null;
  const livesAtCareHome = lead.atCareHome;

  const complete: Record<Step, boolean> = {
    who: riderIds.length > 0,
    where:
      model !== null &&
      start !== null &&
      (start.kind !== "home" || home !== null) &&
      (start.kind !== "careHome" || careHome !== null) &&
      (model === "pleasure" || destination !== null),
    when:
      date !== null &&
      slot !== null &&
      data.days.some((day) => day.date === date),
    note: true,
    review: true,
  };
  const asked = searchParams.get("step") as Step | null;
  const requested =
    asked && steps.includes(asked)
      ? asked
      : prefill?.window
        ? "review"
        : prefill
          ? "when"
          : steps[0];
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
    const popped = () => {
      if (pushed.current > 0) pushed.current -= 1;
    };
    window.addEventListener("popstate", popped);
    return () => window.removeEventListener("popstate", popped);
  }, []);

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

  const pickModel = (next: RequestModel) => {
    setModel(next);
    if (startPicked) return;
    setStart(
      livesAtCareHome ? { kind: "careHome" } : home ? { kind: "home" } : null,
    );
  };

  const pickStart = (next: Start) => {
    setStartPicked(true);
    setStart(next);
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
      : start?.kind === "careHome"
        ? careHome
        : start?.kind === "place"
          ? start.place
          : null;

  const send = () =>
    startTransition(async () => {
      if (!model || !date || !slot) return;
      const request = {
        passengerIds: riderIds,
        model,
        pickup: pickup(),
        destination: model === "functional" ? destination : null,
        roundTrip: model === "functional" && roundTrip,
        window: { date, ...slot },
        note: note.trim() || null,
      };
      const source = prefill?.source ?? null;
      const result =
        source?.kind === "ride"
          ? await rescheduleRideAction({ fromRideId: source.id, request })
          : source?.kind === "request"
            ? await changeRideRequestAction({
                fromRequestId: source.id,
                request,
              })
            : await submitRideRequestAction(request);
      const done =
        source?.kind === "ride"
          ? result.ok && "oldSeatsKept" in result && result.oldSeatsKept
            ? strings.reschedule.doneKept
            : strings.reschedule.done
          : source?.kind === "request" &&
              result.ok &&
              "oldRequestKept" in result &&
              result.oldRequestKept
            ? strings.change.doneKept
            : result.ok && result.rideId
              ? strings.booked
              : source?.kind === "request"
                ? strings.change.done
                : strings.sent;
      notify(result, {
        done: formatMessage(done, { chapter: data.chapterName }, language),
        errors: {
          generic: errors.generic,
          ...errors,
          ...(source?.kind === "request"
            ? strings.change.errors
            : strings.reschedule.errors),
        },
      });
      if (!result.ok) {
        if (WHEN_ERRORS.includes(result.error)) {
          setSlot(null);
          goTo("when");
          router.refresh();
        }
        return;
      }
      leaveFor(`/passenger/rides/requests/${result.id}`);
    });

  const leaveFor = (href: string) => {
    const steps = pushed.current;
    const open = () => router.replace(href, { transitionTypes: ["push"] });
    if (!steps) return open();
    pushed.current = 0;
    window.addEventListener("popstate", open, { once: true });
    window.history.go(-steps);
  };

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
      className="flex flex-1 flex-col gap-6"
      onFocusCapture={(event) =>
        setTyping(event.target instanceof HTMLInputElement)
      }
      onBlurCapture={() => setTyping(false)}
    >
      <div className="flex min-h-11 items-center justify-center">
        <StepDots {...progress} />
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {prefill?.label ?? data.chapterName}
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
            step === "review" && data.automatic
              ? strings.steps.review.bodyAuto
              : copy.body,
            {
              count: data.maxRiders,
              chapter: data.chapterName,
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
          onStart={pickStart}
          destination={destination}
          onDestination={setDestination}
          roundTrip={roundTrip}
          onRoundTrip={setRoundTrip}
          pickupPlace={pickup()}
          notation={notation}
          home={home}
          careHome={careHome}
          careHomeFirst={livesAtCareHome}
          destinations={data.destinations}
          strings={strings}
          address={address}
          language={language}
        />
      ) : null}

      {step === "when" ? (
        <WhenStep
          days={data.days}
          closedDays={data.closedDays}
          outsideDays={data.outsideDays}
          date={date}
          onDate={(next) => {
            setDate(next);
            setSlot(null);
          }}
          slot={slot}
          onSlot={setSlot}
          strings={strings}
          language={language}
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
                    value: formatList(
                      chosen.map((rider) => rider.name),
                      wordsLocale(language),
                    ),
                    step: "who" as const,
                  },
                ]),
            {
              label: strings.review.ride,
              value: routeLine(
                strings.models[model],
                {
                  from: pickup()?.name ?? null,
                  to:
                    model === "functional" ? (destination?.name ?? null) : null,
                  back: model === "functional" && roundTrip,
                },
                route,
                language,
              ),
              step: "where" as const,
            },
            {
              label: strings.review.when,
              value: formatMessage(
                dateTime,
                {
                  date: data.days.find((day) => day.date === date)?.label ?? "",
                  time:
                    data.days
                      .find((day) => day.date === date)
                      ?.windows.find(
                        (candidate) =>
                          candidate.startMinute === slot.startMinute &&
                          candidate.endMinute === slot.endMinute,
                      )?.label ?? "",
                },
                language,
              ),
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
          automatic={data.automatic}
          chapter={data.chapterName}
          language={language}
        />
      ) : null}

      <div
        className={cn(
          "sticky z-30 -mx-4 mt-auto flex justify-center bg-linear-to-t from-canvas from-60% to-transparent px-4 pt-3 md:static md:mx-0 md:bg-none md:px-0 md:pt-0",
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
  ref,
  ...body
}: {
  value: string;
  ref?: Ref<HTMLButtonElement>;
  icon: LucideIcon;
  title: string;
  body?: string | null;
}) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
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
  ref,
}: {
  icon: LucideIcon;
  place: Place;
  change: string;
  onChange: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
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
  pickupPlace,
  notation,
  home,
  careHome,
  careHomeFirst,
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
  pickupPlace: Place | null;
  notation: Notation;
  home: Place | null;
  careHome: Place | null;
  careHomeFirst: boolean;
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
  const [changingDestination, setChangingDestination] = useState(false);
  const customCard = useRef<HTMLButtonElement>(null);
  const pickedDestination = useRef<HTMLButtonElement>(null);
  const focusSoon = (target: { current: HTMLButtonElement | null }) =>
    requestAnimationFrame(() => target.current?.focus());
  const where = strings.where;
  const homeCard = home ? (
    <ChoiceCard
      value="home"
      icon={House}
      title={where.home}
      body={home.address}
    />
  ) : null;
  const careHomeCard = careHome ? (
    <ChoiceCard
      value="careHome"
      icon={Building2}
      title={formatMessage(where.careHome, { name: careHome.name }, language)}
      body={careHome.address}
    />
  ) : null;

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
            else if (next === "careHome") onStart({ kind: "careHome" });
            else if (next === "place" && custom)
              onStart({ kind: "place", place: custom });
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
                  focusSoon(customCard);
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
          {careHomeFirst ? careHomeCard : homeCard}
          {careHomeFirst ? homeCard : careHomeCard}
          {custom ? (
            <ChoiceCard
              ref={customCard}
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
              ref={pickedDestination}
              icon={Flag}
              place={destination}
              change={where.change}
              onChange={() => {
                setChangingDestination(true);
                onDestination(null);
              }}
            />
          ) : (
            <>
              <PlaceSearch
                strings={strings}
                address={address}
                language={language}
                autoFocus={changingDestination}
                onPlace={(place) => {
                  onDestination(place);
                  focusSoon(pickedDestination);
                }}
              />
              {destinations.length ? (
                <div className="flex flex-col gap-2">
                  <p className="text-2sm text-ink-soft">{where.previous}</p>
                  <ul className="flex flex-wrap gap-2">
                    {destinations.map((place) => (
                      <li key={`${place.name}|${place.address ?? ""}`}>
                        <button
                          type="button"
                          onClick={() => {
                            onDestination(place);
                            focusSoon(pickedDestination);
                          }}
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
          {destination &&
          pickupPlace &&
          destination.latitude !== null &&
          destination.longitude !== null &&
          pickupPlace.latitude !== null &&
          pickupPlace.longitude !== null ? (
            <RoutePreview
              from={{ lat: pickupPlace.latitude, lng: pickupPlace.longitude }}
              to={{ lat: destination.latitude, lng: destination.longitude }}
              fromName={pickupPlace.name}
              toName={destination.name}
              strings={where}
              language={language}
              notation={notation}
            />
          ) : null}
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
  closedDays,
  outsideDays,
  date,
  onDate,
  slot,
  onSlot,
  strings,
  language,
}: {
  days: RequestFormData["days"];
  closedDays: Record<string, string>;
  outsideDays: string;
  date: string | null;
  onDate: (date: string | null) => void;
  slot: Window | null;
  onSlot: (slot: Window) => void;
  strings: Strings;
  language: Locale;
}) {
  const inputId = useId();
  const hintId = useId();

  if (!days.length)
    return (
      <p className="rounded-2xl bg-canvas-deep p-4 text-sm text-ink-soft">
        {strings.when.none}
      </p>
    );

  const day = days.find((candidate) => candidate.date === date) ?? null;
  const blocked = date && !day ? (closedDays[date] ?? outsideDays) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
        >
          {strings.when.dayLabel}
        </label>
        <input
          id={inputId}
          type="date"
          min={days[0].date}
          max={days[days.length - 1].date}
          value={date ?? ""}
          onChange={(event) => {
            const next = event.target.value || null;
            if (next && days.some((candidate) => candidate.date === next))
              haptics.selectionChanged();
            onDate(next);
          }}
          aria-invalid={blocked ? true : undefined}
          aria-describedby={day ? undefined : hintId}
          className="flex min-h-12 w-full appearance-none items-center rounded-2xl border border-line bg-paper px-4 text-left text-base text-ink tabular-nums focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none aria-invalid:border-red [&::-webkit-date-and-time-value]:text-left"
        />
        {day ? null : (
          <p
            id={hintId}
            role={blocked ? "alert" : undefined}
            className={cn(
              "text-2sm",
              blocked ? "text-red-ink" : "text-ink-soft",
            )}
          >
            {blocked ?? strings.when.pickDay}
          </p>
        )}
      </div>

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
      ) : null}
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

function ReviewRow({
  row,
  change,
  onEdit,
}: {
  row: { label: string; value: string; step: Step };
  change: string;
  onEdit: (step: Step) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <dl className="grid min-w-0 flex-1 gap-0.5">
        <dt
          id={labelId}
          className="text-2sm text-ink-soft"
        >
          {row.label}
        </dt>
        <dd className="break-words">{row.value}</dd>
      </dl>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-describedby={labelId}
        className="min-h-11 shrink-0 text-ink-soft"
        onClick={() => onEdit(row.step)}
      >
        {change}
      </Button>
    </div>
  );
}

function ReviewStep({
  rows,
  onEdit,
  strings,
  automatic,
  chapter,
  language,
}: {
  rows: { label: string; value: string; step: Step }[];
  onEdit: (step: Step) => void;
  strings: Strings;
  automatic: boolean;
  chapter: string;
  language: Locale;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {rows.map((row) => (
          <ReviewRow
            key={row.label}
            row={row}
            change={strings.review.change}
            onEdit={onEdit}
          />
        ))}
      </div>
      <p className="rounded-2xl bg-mint-tint p-4 text-sm text-pretty">
        {formatMessage(
          automatic ? strings.review.waitingAuto : strings.review.waiting,
          { chapter },
          language,
        )}
      </p>
    </div>
  );
}
