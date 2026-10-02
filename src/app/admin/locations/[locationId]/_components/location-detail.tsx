"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Archive, Bike, ExternalLink, MapPin, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { InlineField } from "@/components/inline-field";
import { RichText } from "@/components/markdown";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  archiveLocationAction,
  updateLocationAction,
} from "@/features/fleet/actions";
import { PhotoGallery } from "@/features/fleet/components/photo-gallery";
import type { LocationUpdateInput } from "@/features/fleet/schemas";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { googleMapsUrl } from "@/lib/geo";
import {
  PROPERTY_BUTTON,
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";
import { DetailTitle } from "../../../_components/detail-title";
import {
  DETAIL_MEDIA,
  DetailHeader,
  DetailLayout,
  DetailSection,
} from "../../../_components/detail-page";
import { SidePanel } from "../../../_components/side-panel";
import { LocationPlace, type Place } from "../../_components/location-place";
import { PoolCode, PoolManageToggle } from "../../_components/pool-code";
import {
  PoolMembers,
  PoolRequests,
  type PoolMember,
} from "../../_components/pool-members";

export type LocationDetailData = {
  id: string;
  kind: "chapter" | "pool";
  name: string;
  isDefault: boolean;
  poolCode: string | null;
  membersMayManage: boolean;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  entrance: string | null;
  entrancePhotoFileId: string | null;
  accessCode: string | null;
  accessNotes: string | null;
  returnInstructions: string | null;
  ownerName: string;
  trishawCount: string;
};

export type LocationTrishaw = {
  id: string;
  name: string;
  status: string;
  href: string;
};

export function LocationDetail({
  location,
  trishaws,
  members,
  canManage,
  mapEnabled,
  language,
  backHref,
  strings,
  common,
  markdown,
}: {
  location: LocationDetailData;
  trishaws: LocationTrishaw[];
  members: PoolMember[] | null;
  canManage: boolean;
  mapEnabled: boolean;
  language: Locale;
  backHref: string;
  strings: Dictionary["fleet"]["locations"];
  common: Dictionary["fleet"]["common"];
  markdown: MarkdownToolLabels;
}) {
  const router = useRouter();
  const detail = strings.detail;
  const field = { ...strings.field, errors: common.errors };
  const isPool = location.kind === "pool";
  const save = (input: LocationUpdateInput): Promise<ActionResult> =>
    updateLocationAction(location.id, input);

  const richField = (
    key: "accessNotes" | "returnInstructions",
    label: string,
    placeholder: string,
  ) =>
    canManage ? (
      <InlineField
        multiline
        maxLength={5_000}
        value={location[key]}
        label={label}
        placeholder={placeholder}
        markdown={markdown}
        display={(value) => <RichText text={value} />}
        onSave={(next) => save({ [key]: next })}
        labels={field}
      />
    ) : location[key] ? (
      <RichText text={location[key]} />
    ) : (
      <p className="text-2sm text-ink-faint">{placeholder}</p>
    );

  const Icon = isPool ? Warehouse : MapPin;

  return (
    <SaveStatusProvider>
      <DetailLayout
        header={
          <DetailHeader
            media={
              <span
                aria-hidden
                className={cn(
                  DETAIL_MEDIA,
                  "grid place-items-center bg-mint-tint text-ink",
                )}
              >
                <Icon className="size-5" />
              </span>
            }
            title={
              <DetailTitle
                value={location.name}
                label={detail.name}
                maxLength={120}
                onSave={canManage ? (next) => save({ name: next }) : undefined}
                labels={field}
              />
            }
            aside={
              canManage ? (
                <SaveStatus
                  labels={strings.status}
                  words={language}
                />
              ) : undefined
            }
          >
            <div className="flex flex-wrap items-center gap-2 text-2sm text-ink-soft">
              <Badge className="bg-mint-tint font-normal text-ink">
                {common.kinds[location.kind]}
              </Badge>
              {location.isDefault ? (
                <Badge className="bg-mint font-normal text-ink">
                  {strings.isDefault}
                </Badge>
              ) : null}
              <span>{location.ownerName}</span>
              <span aria-hidden>·</span>
              <span>{location.trishawCount}</span>
            </div>
          </DetailHeader>
        }
        sidebar={
          <>
            <SidePanel title={detail.properties}>
              <PropertyList>
                <PropertyRow label={detail.kind}>
                  <PropertyValue>{common.kinds[location.kind]}</PropertyValue>
                </PropertyRow>
                <PropertyRow label={detail.owner}>
                  <PropertyValue>{location.ownerName}</PropertyValue>
                </PropertyRow>
                <PropertyRow label={detail.accessCode}>
                  {canManage ? (
                    <InlineField
                      compact
                      maxLength={64}
                      value={location.accessCode}
                      label={detail.accessCode}
                      placeholder={detail.accessCodePlaceholder}
                      onSave={(next) => save({ accessCode: next })}
                      labels={field}
                      className="font-mono text-2sm"
                    />
                  ) : (
                    <PropertyValue
                      muted={!location.accessCode}
                      className="font-mono"
                    >
                      {location.accessCode ?? "–"}
                    </PropertyValue>
                  )}
                </PropertyRow>
              </PropertyList>
              {!canManage ? (
                <p className="text-2sm text-ink-soft">{detail.readOnly}</p>
              ) : null}
            </SidePanel>

            {isPool && canManage ? (
              <SidePanel title={common.pool}>
                <PoolCode
                  poolId={location.id}
                  code={location.poolCode}
                  strings={strings}
                  errors={common.errors}
                  locale={language}
                />
                <PoolManageToggle
                  poolId={location.id}
                  value={location.membersMayManage}
                  strings={strings}
                  labels={field}
                />
              </SidePanel>
            ) : null}

            {canManage ? (
              <SidePanel title={detail.danger}>
                {location.isDefault ? (
                  <p className="text-2sm text-ink-soft">{detail.defaultHint}</p>
                ) : isPool ? (
                  <ConfirmDeleteDialog
                    name={location.name}
                    locale={language}
                    labels={{ ...detail.deletePool, errors: common.errors }}
                    cancel={strings.cancel}
                    action={() => archiveLocationAction(location.id)}
                    onDone={() => router.push(backHref)}
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
                    cancel={strings.cancel}
                    destructive
                    done={formatMessage(
                      detail.archive.done,
                      { name: location.name },
                      language,
                    )}
                    errors={common.errors}
                    action={() => archiveLocationAction(location.id)}
                    onDone={() => router.push(backHref)}
                    className={PROPERTY_BUTTON}
                  />
                )}
              </SidePanel>
            ) : null}
          </>
        }
      >
        {members ? (
          <PoolRequests
            members={members}
            strings={strings}
            errors={common.errors}
            locale={language}
          />
        ) : null}

        <DetailSection title={detail.accessNotes}>
          {richField(
            "accessNotes",
            detail.accessNotes,
            detail.accessNotesPlaceholder,
          )}
        </DetailSection>

        <DetailSection title={detail.returnInstructions}>
          {richField(
            "returnInstructions",
            detail.returnInstructions,
            detail.returnInstructionsPlaceholder,
          )}
        </DetailSection>

        <DetailSection title={detail.entrance}>
          {canManage ? (
            <InlineField
              maxLength={500}
              value={location.entrance}
              label={detail.entrance}
              placeholder={detail.entrancePlaceholder}
              onSave={(next) => save({ entrance: next })}
              labels={field}
              className="text-2sm"
            />
          ) : (
            <p
              className={
                location.entrance ? "text-2sm" : "text-2sm text-ink-faint"
              }
            >
              {location.entrance ?? detail.entrancePlaceholder}
            </p>
          )}
          {canManage || location.entrancePhotoFileId ? (
            <PhotoGallery
              kind="entrancePhoto"
              locale={language}
              max={1}
              readOnly={!canManage}
              value={
                location.entrancePhotoFileId
                  ? [location.entrancePhotoFileId]
                  : []
              }
              alt={detail.entrancePhoto}
              labels={{ ...common.gallery, errors: common.errors }}
              className="max-w-md"
              onChange={(fileIds) =>
                updateLocationAction(location.id, {
                  entrancePhotoFileId: fileIds[0] ?? null,
                })
              }
            />
          ) : (
            <p className="text-2sm text-ink-faint">{detail.noEntrancePhoto}</p>
          )}
        </DetailSection>

        <DetailSection title={detail.place}>
          <PlaceEditor
            location={location}
            canManage={canManage}
            mapEnabled={mapEnabled}
            language={language}
            strings={strings}
            common={common}
          />
        </DetailSection>

        <DetailSection title={detail.trishaws}>
          {trishaws.length > 0 ? (
            <ul className="grid divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {trishaws.map((trishaw) => (
                <li key={trishaw.id}>
                  <Link
                    href={trishaw.href}
                    className="flex min-h-11 items-center gap-3 px-4 py-2 transition-colors hover:bg-canvas-deep"
                  >
                    <Bike
                      aria-hidden
                      className="size-4 shrink-0 text-ink-soft"
                    />
                    <span className="min-w-0 flex-1 truncate text-2sm font-medium">
                      {trishaw.name}
                    </span>
                    <span className="text-2sm text-ink-soft">
                      {trishaw.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-2sm text-ink-soft">{detail.noTrishaws}</p>
          )}
        </DetailSection>

        {members ? (
          <DetailSection title={strings.members}>
            <PoolMembers
              poolId={location.id}
              poolName={location.name}
              members={members}
              strings={strings}
              errors={common.errors}
              locale={language}
            />
          </DetailSection>
        ) : null}
      </DetailLayout>
    </SaveStatusProvider>
  );
}

function PlaceEditor({
  location,
  canManage,
  mapEnabled,
  language,
  strings,
  common,
}: {
  location: LocationDetailData;
  canManage: boolean;
  mapEnabled: boolean;
  language: string;
  strings: Dictionary["fleet"]["locations"];
  common: Dictionary["fleet"]["common"];
}) {
  const { address, latitude, longitude } = location;
  const server = useMemo<Place>(
    () => ({ address, latitude, longitude }),
    [address, latitude, longitude],
  );
  const { shown, persist } = useOptimisticSave(
    server,
    (next) => updateLocationAction(location.id, next),
    { ...strings.field, errors: common.errors },
  );
  const maps = googleMapsUrl(shown);

  return (
    <div className="grid gap-2">
      {!canManage ? (
        <p className="text-2sm">{shown.address ?? strings.noAddress}</p>
      ) : null}
      <LocationPlace
        value={shown}
        onChange={(next) => void persist(next, shown)}
        mapEnabled={mapEnabled}
        language={language}
        strings={strings}
        failed={common.errors.generic}
        readOnly={!canManage}
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
            {strings.openInGoogleMaps}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
