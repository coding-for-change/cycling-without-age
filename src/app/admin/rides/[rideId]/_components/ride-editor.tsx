"use client";

import Link from "next/link";
import { useId, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { Globe, Lock, PartyPopper, Route, Wind } from "lucide-react";
import type { ActionResult } from "@/components/action-feedback";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { Badge } from "@/components/ui/badge";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  rescheduleRideAction,
  updateRideAction,
} from "@/features/rides/actions";
import {
  RIDE_MAX_PILOTS,
  RIDE_MODELS,
  RIDE_NOTE_MAX,
  type RideModelName,
  type RideStatusName,
  type WallSlot,
} from "@/features/rides/schemas";
import {
  formatDate,
  formatDuration,
  formatTime,
  wordsLocale,
  type Locale as Notation,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import type { ResolvedPlace } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import {
  DETAIL_MEDIA,
  DETAIL_TITLE,
  DetailHeader,
  DetailLayout,
} from "../../../_components/detail-page";
import { PlaceSearch } from "../../../_components/place-search";
import {
  PropertyList,
  PropertyRow,
  PropertySelect,
  PropertyValue,
} from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";

type Place = {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Strings = Dictionary["rides"]["detail"];

export type RideEditorLabels = {
  detail: Strings;
  models: Record<RideModelName, string>;
  statuses: Record<RideStatusName, string>;
  errors: InlineFieldLabels["errors"];
  field: InlineFieldLabels;
  status: { saving: string; saved: string };
};

export type RideEditorProps = {
  ride: {
    id: string;
    model: RideModelName;
    status: RideStatusName;
    slot: WallSlot;
    requiredPilots: number;
    location: Place;
    destination: Place;
    leg: { kind: "back" | "there"; href: string; label: string } | null;
  };
  header: {
    title: string;
    when: string;
    chapter: string;
    zone: string;
    zoneHint: string;
  };
  editable: boolean;
  language: Locale;
  notation: Notation;
  labels: RideEditorLabels;
  panels: ReactNode;
  children: ReactNode;
};

const MODEL_ICON = {
  event: PartyPopper,
  pleasure: Wind,
  functional: Route,
} as const;

const STATUS_TONE: Record<RideStatusName, string> = {
  scheduled: "bg-mint-tint text-ink",
  completed: "bg-mint text-ink",
  cancelled: "bg-canvas-deeper text-ink-soft",
};

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];
const QUARTERS = Array.from({ length: 96 }, (_, index) => {
  const minutes = index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

const wallTime = (time: string, notation: Notation) =>
  formatTime(new Date(`1970-01-01T${time}:00Z`), notation, "UTC");

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
  panels,
  children,
}: RideEditorProps) {
  const { detail } = labels;
  const ids = {
    model: useId(),
    start: useId(),
    duration: useId(),
    pilots: useId(),
  };
  const { id, slot } = ride;
  const words = wordsLocale(language);
  const roundTrip = ride.leg !== null;

  const model = useOptimisticSave(
    ride.model,
    (next) => updateRideAction(id, { model: next }),
    labels.field,
  );
  const reschedule = (next: Partial<WallSlot>) =>
    rescheduleRideAction(id, { ...slot, ...next });
  const start = useOptimisticSave(
    slot.start,
    (next) => reschedule({ start: next }),
    labels.field,
  );
  const duration = useOptimisticSave(
    String(slot.durationMinutes),
    (next) => reschedule({ durationMinutes: Number(next) }),
    labels.field,
  );
  const pilots = useOptimisticSave(
    String(ride.requiredPilots),
    (next) => updateRideAction(id, { requiredPilots: Number(next) }),
    labels.field,
  );

  const Icon = MODEL_ICON[ride.model];
  const showsDestination = model.shown === "functional";

  return (
    <DetailLayout
      header={
        <DetailHeader
          media={
            <span
              aria-hidden
              className={cn(
                DETAIL_MEDIA,
                "grid place-items-center",
                ride.status === "cancelled"
                  ? "bg-canvas-deep text-ink-faint"
                  : ride.model === "functional"
                    ? "bg-canvas-deeper text-ink"
                    : "bg-mint-tint text-ink",
              )}
            >
              <Icon className="size-5" />
            </span>
          }
          title={
            <span
              className={cn(
                DETAIL_TITLE,
                ride.status === "cancelled" &&
                  "text-ink-soft line-through decoration-1",
              )}
            >
              {header.title}
            </span>
          }
          aside={
            editable ? (
              <SaveStatus
                labels={labels.status}
                words={language}
              />
            ) : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2sm text-ink-soft">
            <Badge className={cn("font-normal", STATUS_TONE[ride.status])}>
              {labels.statuses[ride.status]}
            </Badge>
            <span className="tabular-nums text-ink">{header.when}</span>
            <span aria-hidden>·</span>
            <span>{header.chapter}</span>
          </div>
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
                  <PropertySelect
                    id={ids.model}
                    value={model.shown}
                    options={RIDE_MODELS.map((value) => ({
                      value,
                      label: labels.models[value],
                    }))}
                    onChange={(next) => {
                      if (next !== model.shown)
                        void model.persist(next, model.shown);
                    }}
                  />
                ) : (
                  <PropertyValue className="inline-flex items-center gap-1.25">
                    {roundTrip && editable ? (
                      <Lock
                        aria-hidden
                        className="size-3.5 shrink-0 text-ink-soft"
                      />
                    ) : null}
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
                  <PropertySelect
                    id={ids.start}
                    value={start.shown}
                    options={withCurrent(QUARTERS, start.shown, (a, b) =>
                      a.localeCompare(b),
                    ).map((value) => ({
                      value,
                      label: wallTime(value, notation),
                    }))}
                    onChange={(next) => {
                      if (next !== start.shown)
                        void start.persist(next, start.shown);
                    }}
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
                  <PropertySelect
                    id={ids.duration}
                    value={duration.shown}
                    options={withCurrent(
                      DURATIONS.map(String),
                      duration.shown,
                      (a, b) => Number(a) - Number(b),
                    ).map((value) => ({
                      value,
                      label: formatDuration(Number(value) * 60, words),
                    }))}
                    onChange={(next) => {
                      if (next !== duration.shown)
                        void duration.persist(next, duration.shown);
                    }}
                  />
                ) : (
                  <PropertyValue>
                    {formatDuration(slot.durationMinutes * 60, words)}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={detail.pilotsNeeded}
                htmlFor={editable ? ids.pilots : undefined}
              >
                {editable ? (
                  <PropertySelect
                    id={ids.pilots}
                    value={pilots.shown}
                    options={Array.from({ length: RIDE_MAX_PILOTS }, (_, i) =>
                      String(i + 1),
                    ).map((value) => ({ value, label: value }))}
                    onChange={(next) => {
                      if (next !== pilots.shown)
                        void pilots.persist(next, pilots.shown);
                    }}
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
          </SidePanel>

          <SidePanel title={detail.where}>
            <PlaceField
              rideId={id}
              kind="location"
              label={detail.pickup}
              value={ride.location}
              editable={editable}
              language={language}
              labels={labels}
            />
            {showsDestination ? (
              <PlaceField
                rideId={id}
                kind="destination"
                label={detail.destination}
                value={ride.destination}
                editable={editable}
                language={language}
                labels={labels}
              />
            ) : null}
          </SidePanel>

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

const placeName = (found: ResolvedPlace) =>
  found.poiName ?? found.address.split(",")[0]?.trim() ?? found.address;

function PlaceField({
  rideId,
  kind,
  label,
  value,
  editable,
  language,
  labels,
}: {
  rideId: string;
  kind: "location" | "destination";
  label: string;
  value: Place;
  editable: boolean;
  language: Locale;
  labels: RideEditorLabels;
}) {
  const { name, address, latitude, longitude } = value;
  const server = useMemo<Place>(
    () => ({ name, address, latitude, longitude }),
    [name, address, latitude, longitude],
  );
  const { shown, persist } = useOptimisticSave(
    server,
    (next) =>
      updateRideAction(
        rideId,
        kind === "location"
          ? {
              locationName: next.name,
              locationAddress: next.address,
              latitude: next.latitude,
              longitude: next.longitude,
            }
          : {
              destinationName: next.name,
              destinationAddress: next.address,
              destinationLatitude: next.latitude,
              destinationLongitude: next.longitude,
            },
      ),
    labels.field,
  );
  const named = shown.name && shown.name !== shown.address ? shown.name : null;

  return (
    <div className="grid gap-1.25">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {named ? <span className="truncate text-2sm">{named}</span> : null}
      {editable ? (
        <PlaceSearch
          address={shown.address}
          language={language}
          strings={labels.detail.place}
          failed={labels.errors.generic}
          onPlace={(found) =>
            persist(
              {
                name: placeName(found),
                address: found.address,
                latitude: found.coords.lat,
                longitude: found.coords.lng,
              },
              shown,
            )
          }
        />
      ) : (
        <span
          className={cn(
            "text-2sm text-pretty",
            shown.address ? "text-ink-soft" : "text-ink-faint",
          )}
        >
          {shown.address ?? (named ? null : labels.detail.noPlace)}
        </span>
      )}
    </div>
  );
}

export function PilotNote({
  rideId,
  note,
  editable,
  label,
  placeholder,
  labels,
}: {
  rideId: string;
  note: string | null;
  editable: boolean;
  label: string;
  placeholder: string;
  labels: InlineFieldLabels;
}) {
  if (!editable)
    return (
      <p
        className={cn(
          "text-2sm whitespace-pre-wrap break-words",
          !note && "text-ink-faint",
        )}
      >
        {note ?? placeholder}
      </p>
    );
  return (
    <InlineField
      multiline
      maxLength={RIDE_NOTE_MAX}
      value={note}
      label={label}
      placeholder={placeholder}
      onSave={(next): Promise<ActionResult> =>
        updateRideAction(rideId, { note: next })
      }
      labels={labels}
      className="text-2sm"
    />
  );
}
