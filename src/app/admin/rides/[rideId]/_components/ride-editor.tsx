"use client";

import Link from "next/link";
import {
  useId,
  useState,
  useSyncExternalStore,
  ViewTransition,
  type ReactNode,
} from "react";
import { Globe, Lock } from "lucide-react";
import { reportSave } from "@/components/action-feedback";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SaveStatusProvider, useSaveStatus } from "@/components/save-status";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  rescheduleRideAction,
  updateRideAction,
} from "@/features/rides/actions";
import { MODEL_ICON } from "@/features/rides/components/ride-presentation";
import {
  parseCapacity,
  PLEASURE_LIMITS,
  RIDE_MAX_PILOTS,
  RIDE_MODELS,
  RIDE_NOTE_MAX,
  RIDE_TITLE_MAX,
  type RideModelName,
  type RideStatusName,
  type WallSlot,
} from "@/features/rides/schemas";
import {
  CLOCK_STEPS,
  clockLabel,
  clockToMinutes,
  minutesToClock,
} from "@/lib/clock";
import {
  formatDate,
  formatDuration,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import type { RideDetailStrings } from "@/features/rides/components/strings";
import type { Locale } from "@/lib/i18n/locales";
import type { Route as RideRoute } from "@/lib/mapbox";
import { fileUrl } from "@/lib/storage/file-url";
import { cn } from "@/lib/utils";
import {
  DETAIL_MEDIA,
  DETAIL_TITLE,
  DetailHeader,
  DetailHeaderActions,
  DetailLayout,
  DetailMediaIcon,
  DetailMeta,
  MetaBadge,
} from "../../../_components/detail-page";
import { DetailTitle } from "../../../_components/detail-title";
import {
  EditableText,
  type EditableTextProps,
} from "../../../_components/editable-text";
import { OptimisticPropertySelect } from "../../../_components/optimistic-properties";
import {
  PropertyList,
  PropertyRow,
  PropertySelect,
  PropertyValue,
} from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";
import { MakeEventPopover, type MakeEventLabels } from "./make-event-popover";
import {
  MakeFunctionalPopover,
  type MakeFunctionalLabels,
} from "./make-functional-popover";
import { RideWhere, type Place } from "./ride-where";

type Strings = RideDetailStrings;

export type RideEditorLabels = {
  detail: Strings;
  models: Record<RideModelName, string>;
  statuses: Record<RideStatusName, string>;
  errors: InlineFieldLabels["errors"];
  field: InlineFieldLabels;
  status: { saving: string; saved: string };
  makeEvent: MakeEventLabels;
  makeFunctional: MakeFunctionalLabels;
};

export type RideEditorProps = {
  ride: {
    id: string;
    model: RideModelName;
    status: RideStatusName;
    slot: WallSlot;
    requiredPilots: number;
    title: string | null;
    capacity: number | null;
    riders: number;
    location: Place;
    destination: Place;
    home: Place | null;
    leg: { kind: "back" | "there"; href: string; label: string } | null;
  };
  header: {
    title: string;
    when: string;
    chapter: string;
    zone: string;
    zoneHint: string;
    cover: string | null;
  };
  editable: boolean;
  language: Locale;
  notation: Notation;
  labels: RideEditorLabels;
  route: Promise<RideRoute | null> | null;
  trash: ReactNode;
  panels: ReactNode;
  children: ReactNode;
};

const STATUS_TONE: Record<RideStatusName, string> = {
  scheduled: "bg-mint-tint text-ink",
  completed: "bg-mint text-ink",
  cancelled: "bg-canvas-deeper text-ink-soft",
};

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];
const QUARTERS = CLOCK_STEPS.map(minutesToClock);

const wallTime = (time: string, notation: Notation) =>
  clockLabel(clockToMinutes(time), notation);

const destinationPatch = (place: Place) => ({
  destinationName: place.name,
  destinationAddress: place.address,
  destinationLatitude: place.latitude,
  destinationLongitude: place.longitude,
});

const hasPlace = (place: Place) =>
  Boolean(place.name || place.address) ||
  (place.latitude !== null && place.longitude !== null);

const withCurrent = <T,>(
  values: T[],
  current: T,
  order: (a: T, b: T) => number,
) => (values.includes(current) ? values : [...values, current].sort(order));

export function RideEditor(props: RideEditorProps) {
  return (
    <SaveStatusProvider>
      <EditorLayout {...props} />
    </SaveStatusProvider>
  );
}

function EditorLayout({
  ride,
  header,
  editable,
  language,
  notation,
  labels,
  route,
  trash,
  panels,
  children,
}: RideEditorProps) {
  const { detail } = labels;
  const ids = {
    model: useId(),
    start: useId(),
    duration: useId(),
    pilots: useId(),
    capacity: useId(),
  };
  const { id, slot } = ride;
  const words = wordsLocale(language);
  const roundTrip = ride.leg !== null;

  const report = useSaveStatus();
  const [making, setMaking] = useState<"event" | "functional" | null>(null);
  const model = useOptimisticSave(
    ride.model,
    (next) =>
      updateRideAction(
        id,
        next === "event"
          ? {
              model: next,
              ...(ride.title ? { title: ride.title } : {}),
              ...(ride.capacity === null ? {} : { capacity: ride.capacity }),
            }
          : next === "functional" && hasPlace(ride.destination)
            ? { model: next, ...destinationPatch(ride.destination) }
            : { model: next },
      ),
    labels.field,
  );
  const switchModel = async (
    next: "event" | "functional",
    details: Record<string, unknown>,
  ) => {
    const previous = model.shown;
    report("saving");
    const result = await updateRideAction(id, { model: next, ...details });
    if (!result.ok) {
      report("failed");
      return result;
    }
    setMaking(null);
    reportSave(result, {
      report,
      labels: labels.field,
      undo: () => void model.persist(previous, next, false, true),
    });
    return result;
  };
  const reschedule = (next: Partial<WallSlot>) =>
    rescheduleRideAction(id, { ...slot, ...next });
  const showsDestination = model.shown === "functional";
  const pleasure = model.shown === "pleasure";
  const event = ride.model === "event";

  return (
    <DetailLayout
      header={
        <DetailHeader
          media={
            header.cover && event ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl(header.cover)}
                alt=""
                className={cn(
                  DETAIL_MEDIA,
                  "border border-line object-cover",
                  ride.status === "cancelled" && "opacity-60 grayscale",
                )}
              />
            ) : (
              <DetailMediaIcon
                icon={MODEL_ICON[ride.model]}
                tone={
                  ride.status === "cancelled"
                    ? "muted"
                    : ride.model === "functional"
                      ? "deep"
                      : "mint"
                }
              />
            )
          }
          title={
            <ViewTransition name={`ride-title-${id}`}>
              {event && editable ? (
                <DetailTitle
                  value={ride.title ?? header.title}
                  label={detail.eventTitle}
                  maxLength={RIDE_TITLE_MAX}
                  onSave={(next) => updateRideAction(id, { title: next })}
                  labels={labels.field}
                />
              ) : (
                <span
                  className={cn(
                    DETAIL_TITLE,
                    ride.status === "cancelled" &&
                      "text-ink-soft line-through decoration-1",
                  )}
                >
                  {(event && ride.title) || header.title}
                </span>
              )}
            </ViewTransition>
          }
          aside={
            <DetailHeaderActions
              saveStatus={
                editable
                  ? { labels: labels.status, words: language }
                  : undefined
              }
            >
              {trash}
            </DetailHeaderActions>
          }
        >
          <DetailMeta>
            <MetaBadge className={STATUS_TONE[ride.status]}>
              {labels.statuses[ride.status]}
            </MetaBadge>
            <span className="tabular-nums text-ink">{header.when}</span>
            <span>{header.chapter}</span>
          </DetailMeta>
          <ZoneHint
            zone={header.zone}
            label={header.zoneHint}
          />
        </DetailHeader>
      }
      sidebar={
        <>
          <SidePanel title={detail.properties}>
            <PropertyList>
              <PropertyRow
                label={detail.model}
                htmlFor={editable && !roundTrip ? ids.model : undefined}
              >
                {editable && !roundTrip ? (
                  <MakeFunctionalPopover
                    open={making === "functional"}
                    onCancel={() => setMaking(null)}
                    language={language}
                    onConfirm={(destination) =>
                      switchModel("functional", destinationPatch(destination))
                    }
                    labels={labels.makeFunctional}
                  >
                    <MakeEventPopover
                      open={making === "event"}
                      onCancel={() => setMaking(null)}
                      defaultTitle={ride.title ?? header.title}
                      riders={ride.riders}
                      onConfirm={(details) => switchModel("event", details)}
                      labels={labels.makeEvent}
                    >
                      <PropertySelect
                        id={ids.model}
                        value={model.shown}
                        options={RIDE_MODELS.map((value) => ({
                          value,
                          label: labels.models[value],
                        }))}
                        onChange={(next) => {
                          if (next === model.shown) return;
                          if (next === "event") setMaking("event");
                          else if (
                            next === "functional" &&
                            !hasPlace(ride.destination)
                          )
                            setMaking("functional");
                          else void model.persist(next, model.shown);
                        }}
                      />
                    </MakeEventPopover>
                  </MakeFunctionalPopover>
                ) : (
                  <PropertyValue
                    icon={roundTrip && editable ? Lock : undefined}
                  >
                    {labels.models[ride.model]}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow label={detail.date}>
                {editable ? (
                  <InlineField
                    compact
                    required
                    type="date"
                    value={slot.date}
                    label={detail.date}
                    placeholder={detail.date}
                    display={(value) => formatDate(value, notation)}
                    onSave={(next) => reschedule({ date: next ?? slot.date })}
                    labels={labels.field}
                    className="text-2sm tabular-nums"
                  />
                ) : (
                  <PropertyValue className="tabular-nums">
                    {formatDate(slot.date, notation)}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={detail.start}
                htmlFor={editable ? ids.start : undefined}
              >
                {editable ? (
                  <OptimisticPropertySelect
                    id={ids.start}
                    value={slot.start}
                    options={withCurrent(QUARTERS, slot.start, (a, b) =>
                      a.localeCompare(b),
                    ).map((value) => ({
                      value,
                      label: wallTime(value, notation),
                    }))}
                    onSave={(next) => reschedule({ start: next })}
                    labels={labels.field}
                  />
                ) : (
                  <PropertyValue className="tabular-nums">
                    {wallTime(slot.start, notation)}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={detail.duration}
                htmlFor={editable ? ids.duration : undefined}
              >
                {editable ? (
                  <OptimisticPropertySelect
                    id={ids.duration}
                    value={String(slot.durationMinutes)}
                    options={withCurrent(
                      DURATIONS.map(String),
                      String(slot.durationMinutes),
                      (a, b) => Number(a) - Number(b),
                    ).map((value) => ({
                      value,
                      label: formatDuration(Number(value) * 60, words),
                    }))}
                    onSave={(next) =>
                      reschedule({ durationMinutes: Number(next) })
                    }
                    labels={labels.field}
                  />
                ) : (
                  <PropertyValue>
                    {formatDuration(slot.durationMinutes * 60, words)}
                  </PropertyValue>
                )}
              </PropertyRow>
              {event ? (
                <PropertyRow
                  label={detail.capacity}
                  htmlFor={editable ? ids.capacity : undefined}
                >
                  {editable ? (
                    <InlineField
                      compact
                      required
                      value={
                        ride.capacity === null ? null : String(ride.capacity)
                      }
                      label={detail.capacity}
                      placeholder={detail.capacityPlaceholder}
                      validate={(next) => parseCapacity(next) !== null}
                      onSave={(next) =>
                        updateRideAction(id, {
                          capacity: next === null ? null : Number(next),
                        })
                      }
                      labels={labels.field}
                      className="text-2sm tabular-nums"
                    />
                  ) : (
                    <PropertyValue muted={ride.capacity === null}>
                      {ride.capacity ?? detail.capacityPlaceholder}
                    </PropertyValue>
                  )}
                </PropertyRow>
              ) : null}
              <PropertyRow
                label={detail.pilotsNeeded}
                htmlFor={editable && !pleasure ? ids.pilots : undefined}
              >
                {pleasure ? (
                  <PropertyValue icon={editable ? Lock : undefined}>
                    {PLEASURE_LIMITS.pilots}
                  </PropertyValue>
                ) : editable ? (
                  <OptimisticPropertySelect
                    id={ids.pilots}
                    value={String(ride.requiredPilots)}
                    options={Array.from({ length: RIDE_MAX_PILOTS }, (_, i) =>
                      String(i + 1),
                    ).map((value) => ({ value, label: value }))}
                    onSave={(next) =>
                      updateRideAction(id, { requiredPilots: Number(next) })
                    }
                    labels={labels.field}
                  />
                ) : (
                  <PropertyValue>{ride.requiredPilots}</PropertyValue>
                )}
              </PropertyRow>
              {ride.leg ? (
                <PropertyRow
                  label={
                    ride.leg.kind === "back" ? detail.wayBack : detail.wayThere
                  }
                >
                  <Link
                    href={ride.leg.href}
                    className="block truncate py-1.5 underline-offset-2 hover:underline"
                  >
                    {ride.leg.label}
                  </Link>
                </PropertyRow>
              ) : null}
            </PropertyList>
            {roundTrip && editable ? (
              <p className="text-xs text-ink-soft">{detail.modelLocked}</p>
            ) : null}
            {pleasure && editable ? (
              <p className="text-xs text-ink-soft">{detail.onePilot}</p>
            ) : null}
          </SidePanel>

          <RideWhere
            rideId={id}
            location={ride.location}
            destination={ride.destination}
            home={ride.home}
            functional={showsDestination}
            route={route}
            editable={editable}
            language={language}
            notation={notation}
            labels={labels}
          />

          {panels}
        </>
      }
    >
      {children}
    </DetailLayout>
  );
}

const subscribeNever = () => () => {};
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => null;

/** The browser's zone is only known after hydration, so the server renders nothing. */
function ZoneHint({ zone, label }: { zone: string; label: string }) {
  const viewer = useSyncExternalStore(subscribeNever, viewerZone, serverZone);
  if (!viewer || viewer === zone) return null;
  return (
    <p className="flex items-center gap-1.25 text-xs text-ink-soft">
      <Globe
        aria-hidden
        className="size-3.5"
      />
      {label}
    </p>
  );
}

export function PilotNote({
  rideId,
  ...props
}: Omit<EditableTextProps, "onSave" | "multiline" | "maxLength"> & {
  rideId: string;
}) {
  return (
    <EditableText
      {...props}
      multiline
      maxLength={RIDE_NOTE_MAX}
      onSave={(next) => updateRideAction(rideId, { note: next })}
    />
  );
}
