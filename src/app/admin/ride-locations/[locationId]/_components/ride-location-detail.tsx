"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Archive,
  CalendarPlus,
  ExternalLink,
  MapPin,
  Route,
} from "lucide-react";
import type { ActionResult } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { InlineField } from "@/components/inline-field";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { Button } from "@/components/ui/button";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  archiveRideLocationAction,
  restoreRideLocationAction,
  updateRideLocationAction,
} from "@/features/ride-locations/actions";
import {
  RIDE_LOCATION_KINDS,
  RIDE_LOCATION_LIMITS,
  type RideLocationKind,
  type RideLocationUpdateInput,
} from "@/features/ride-locations/schemas";
import { isEmail } from "@/lib/email";
import { googleMapsUrl } from "@/lib/geo";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  DetailEditorShell,
  DetailEmpty,
  DetailHeader,
  DetailHeaderActions,
  DetailList,
  DetailListRow,
  DetailMediaIcon,
  DetailMeta,
  DetailNotice,
  DetailSection,
  MetaBadge,
} from "../../../_components/detail-page";
import { DetailTitle } from "../../../_components/detail-title";
import { EditableText } from "../../../_components/editable-text";
import { OptimisticPropertySelect } from "../../../_components/optimistic-properties";
import {
  PROPERTY_BUTTON,
  PROPERTY_BUTTON_DANGER,
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";
import {
  LocationPlace,
  type Place,
} from "../../../locations/_components/location-place";

type Strings = Dictionary["admin"]["rideLocations"];
type Choice = { value: number; label: string };

export type RideLocationDetailData = {
  id: string;
  kind: RideLocationKind;
  name: string;
  chapterName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  typicalRideKm: number | null;
  defaultTrishawCount: number;
  defaultPilotCount: number;
  defaultMinutes: number | null;
  archived: boolean;
  added: string;
};

export type UpcomingRide = {
  id: string;
  href: string;
  when: string;
  title: string;
  riders: string;
};

export type RideLocationDetailLabels = {
  strings: Strings;
  field: Dictionary["common"]["field"];
  address: Dictionary["common"]["address"];
  errors: Dictionary["common"]["errors"] & Strings["errors"];
  markdown: MarkdownToolLabels;
};

const KM = /^\d{1,3}([.,]\d)?$/;

const breakAfterAt = (email: string) => {
  const at = email.indexOf("@");
  if (at < 0) return email;
  return (
    <>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </>
  );
};
const CHAPTER_DEFAULT = "";
const range = (max: number) =>
  Array.from({ length: max }, (_, index) => index + 1);

export function RideLocationDetail({
  location,
  upcoming,
  scheduleHref,
  minutes,
  mapEnabled,
  language,
  backHref,
  labels,
}: {
  location: RideLocationDetailData;
  upcoming: UpcomingRide[];
  scheduleHref: string;
  minutes: Choice[];
  mapEnabled: boolean;
  language: Locale;
  backHref: string;
  labels: RideLocationDetailLabels;
}) {
  const router = useRouter();
  const { strings } = labels;
  const detail = strings.detail;
  const editable = !location.archived;
  const field = { ...labels.field, errors: labels.errors };
  const save = (input: RideLocationUpdateInput): Promise<ActionResult> =>
    updateRideLocationAction(location.id, input);

  const contactRow = (
    key: "contactName" | "contactPhone" | "contactEmail",
    label: string,
    placeholder: string,
    max: number,
  ) => (
    <PropertyRow label={label}>
      {editable ? (
        <InlineField
          compact
          type={key === "contactEmail" ? "email" : "text"}
          inputMode={key === "contactEmail" ? "email" : "text"}
          maxLength={max}
          value={location[key]}
          label={label}
          placeholder={placeholder}
          validate={key === "contactEmail" ? isEmail : undefined}
          display={key === "contactEmail" ? breakAfterAt : undefined}
          onSave={(next) => save({ [key]: next })}
          labels={field}
          className="text-2sm"
        />
      ) : (
        <PropertyValue muted={!location[key]}>
          {location[key] ?? "–"}
        </PropertyValue>
      )}
    </PropertyRow>
  );

  const choice = <V extends string>(
    value: V,
    options: { value: V; label: string }[],
    onSave: (next: V) => Promise<ActionResult>,
  ) =>
    editable ? (
      <OptimisticPropertySelect
        value={value}
        options={options}
        onSave={onSave}
        labels={field}
      />
    ) : (
      <PropertyValue>
        {options.find((option) => option.value === value)?.label}
      </PropertyValue>
    );

  const numberOptions = (max: number) =>
    range(max).map((count) => ({ value: String(count), label: String(count) }));

  return (
    <DetailEditorShell
      header={
        <DetailHeader
          media={
            <DetailMediaIcon
              icon={MapPin}
              tone={location.archived ? "muted" : "mint"}
            />
          }
          title={
            <DetailTitle
              value={location.name}
              label={detail.name}
              maxLength={RIDE_LOCATION_LIMITS.name}
              onSave={editable ? (next) => save({ name: next }) : undefined}
              labels={field}
            />
          }
          aside={
            <DetailHeaderActions
              saveStatus={
                editable
                  ? { labels: detail.status, words: language }
                  : undefined
              }
            >
              {editable ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-line"
                >
                  <Link href={scheduleHref}>
                    <CalendarPlus aria-hidden />
                    {detail.scheduleHere}
                  </Link>
                </Button>
              ) : null}
            </DetailHeaderActions>
          }
        >
          <DetailMeta>
            <MetaBadge>{strings.kinds[location.kind]}</MetaBadge>
            {location.archived ? (
              <MetaBadge className="bg-canvas-deep text-ink-soft">
                {strings.statuses.archived}
              </MetaBadge>
            ) : null}
            {location.chapterName}
            {location.added}
          </DetailMeta>
        </DetailHeader>
      }
      panels={
        <>
          <SidePanel title={detail.properties}>
            <PropertyList>
              <PropertyRow label={detail.kind}>
                {choice(
                  location.kind,
                  RIDE_LOCATION_KINDS.map((value) => ({
                    value,
                    label: strings.kinds[value],
                  })),
                  (next) => save({ kind: next }),
                )}
              </PropertyRow>
              <PropertyRow label={detail.chapter}>
                <PropertyValue>{location.chapterName}</PropertyValue>
              </PropertyRow>
            </PropertyList>
          </SidePanel>

          <SidePanel title={detail.defaults}>
            <PropertyList>
              <PropertyRow label={detail.defaultMinutes}>
                {choice(
                  location.defaultMinutes === null
                    ? CHAPTER_DEFAULT
                    : String(location.defaultMinutes),
                  [
                    {
                      value: CHAPTER_DEFAULT,
                      label: strings.create.chapterDefault,
                    },
                    ...minutes.map((option) => ({
                      value: String(option.value),
                      label: option.label,
                    })),
                  ],
                  (next) =>
                    save({
                      defaultMinutes:
                        next === CHAPTER_DEFAULT ? null : Number(next),
                    }),
                )}
              </PropertyRow>
              <PropertyRow label={detail.defaultTrishaws}>
                {choice(
                  String(location.defaultTrishawCount),
                  numberOptions(RIDE_LOCATION_LIMITS.trishaws),
                  (next) => save({ defaultTrishawCount: Number(next) }),
                )}
              </PropertyRow>
              <PropertyRow label={detail.defaultPilots}>
                {choice(
                  String(location.defaultPilotCount),
                  numberOptions(RIDE_LOCATION_LIMITS.pilots),
                  (next) => save({ defaultPilotCount: Number(next) }),
                )}
              </PropertyRow>
              <PropertyRow label={detail.typicalRideKm}>
                {editable ? (
                  <InlineField
                    compact
                    maxLength={5}
                    value={
                      location.typicalRideKm === null
                        ? null
                        : String(location.typicalRideKm)
                    }
                    label={detail.typicalRideKm}
                    placeholder={detail.typicalRideKmPlaceholder}
                    validate={(next) => KM.test(next.trim())}
                    display={(value) =>
                      formatMessage(detail.km, { km: value }, language)
                    }
                    onSave={(next) =>
                      save({
                        typicalRideKm:
                          next === null ? null : Number(next.replace(",", ".")),
                      })
                    }
                    labels={field}
                    className="text-2sm"
                  />
                ) : (
                  <PropertyValue muted={location.typicalRideKm === null}>
                    {location.typicalRideKm === null
                      ? "–"
                      : formatMessage(
                          detail.km,
                          { km: location.typicalRideKm },
                          language,
                        )}
                  </PropertyValue>
                )}
              </PropertyRow>
            </PropertyList>
          </SidePanel>

          <SidePanel title={detail.contact}>
            <PropertyList>
              {contactRow(
                "contactName",
                detail.contactName,
                detail.contactNamePlaceholder,
                RIDE_LOCATION_LIMITS.contactName,
              )}
              {contactRow(
                "contactPhone",
                detail.contactPhone,
                detail.contactPhonePlaceholder,
                RIDE_LOCATION_LIMITS.contactPhone,
              )}
              {contactRow(
                "contactEmail",
                detail.contactEmail,
                detail.contactEmailPlaceholder,
                RIDE_LOCATION_LIMITS.contactEmail,
              )}
            </PropertyList>
          </SidePanel>

          <SidePanel
            title={detail.danger}
            defaultOpen={false}
          >
            <p className="text-2sm text-ink-soft">{detail.dangerBody}</p>
            {location.archived ? (
              <ConfirmButton
                label={detail.restore.open}
                title={detail.restore.open}
                body={detail.archivedNotice}
                confirm={detail.restore.open}
                cancel={detail.cancel}
                done={formatMessage(
                  detail.restore.done,
                  { name: location.name },
                  language,
                )}
                errors={labels.errors}
                action={() => restoreRideLocationAction(location.id)}
                onDone={() => router.refresh()}
                className={PROPERTY_BUTTON}
              />
            ) : (
              <ConfirmButton
                icon={<Archive aria-hidden />}
                label={detail.archive.open}
                title={formatMessage(
                  detail.archive.title,
                  { name: location.name },
                  language,
                )}
                body={detail.archive.body}
                confirm={detail.archive.submit}
                cancel={detail.cancel}
                destructive
                done={formatMessage(
                  detail.archive.done,
                  { name: location.name },
                  language,
                )}
                errors={labels.errors}
                action={() => archiveRideLocationAction(location.id)}
                onDone={() => router.push(backHref)}
                className={PROPERTY_BUTTON_DANGER}
              />
            )}
          </SidePanel>
        </>
      }
    >
      {location.archived ? (
        <DetailNotice tone="muted">{detail.archivedNotice}</DetailNotice>
      ) : null}

      <DetailSection title={detail.upcoming}>
        {upcoming.length > 0 ? (
          <DetailList>
            {upcoming.map((ride) => (
              <DetailListRow
                key={ride.id}
                href={ride.href}
              >
                <Route
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft"
                />
                <span className="shrink-0 tabular-nums">{ride.when}</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {ride.title}
                </span>
                <span className="hidden text-ink-soft sm:inline">
                  {ride.riders}
                </span>
              </DetailListRow>
            ))}
          </DetailList>
        ) : (
          <DetailEmpty
            action={
              editable ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-line"
                >
                  <Link href={scheduleHref}>
                    <CalendarPlus aria-hidden />
                    {detail.scheduleHere}
                  </Link>
                </Button>
              ) : null
            }
          >
            {detail.noUpcoming}
          </DetailEmpty>
        )}
      </DetailSection>

      <DetailSection title={detail.notes}>
        <EditableText
          editable={editable}
          markdown={labels.markdown}
          maxLength={RIDE_LOCATION_LIMITS.notes}
          value={location.notes}
          label={detail.notes}
          placeholder={detail.notesPlaceholder}
          onSave={(next) => save({ notes: next })}
          labels={field}
        />
      </DetailSection>

      <DetailSection title={detail.place}>
        <PlaceEditor
          location={location}
          editable={editable}
          mapEnabled={mapEnabled}
          language={language}
          labels={labels}
        />
      </DetailSection>
    </DetailEditorShell>
  );
}

function PlaceEditor({
  location,
  editable,
  mapEnabled,
  language,
  labels,
}: {
  location: RideLocationDetailData;
  editable: boolean;
  mapEnabled: boolean;
  language: string;
  labels: RideLocationDetailLabels;
}) {
  const { strings } = labels;
  const { address, latitude, longitude } = location;
  const server = useMemo<Place>(
    () => ({ address, latitude, longitude }),
    [address, latitude, longitude],
  );
  const { shown, persist } = useOptimisticSave(
    server,
    (next) => updateRideLocationAction(location.id, next),
    { ...labels.field, errors: labels.errors },
  );
  const maps = googleMapsUrl(shown);

  return (
    <div className="grid gap-2">
      {!editable ? (
        <p className="text-2sm">{shown.address ?? strings.noAddress}</p>
      ) : null}
      <LocationPlace
        value={shown}
        onChange={(next) => void persist(next, shown)}
        mapEnabled={mapEnabled}
        language={language}
        strings={{
          map: {
            label: strings.detail.map,
            unavailable: strings.detail.mapUnavailable,
          },
          address: {
            ...labels.address,
            placeholder: strings.create.addressPlaceholder,
            hint: strings.create.addressHint,
          },
        }}
        failed={labels.errors.generic}
        readOnly={!editable}
      />
      {maps ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-fit"
        >
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink aria-hidden />
            {strings.detail.openInGoogleMaps}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
