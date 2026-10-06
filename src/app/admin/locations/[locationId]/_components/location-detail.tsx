"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Bike, ExternalLink, MapPin, Trash2, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { InlineField } from "@/components/inline-field";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  archiveLocationAction,
  updateLocationAction,
} from "@/features/fleet/actions";
import { PhotoGallery } from "@/components/photo-gallery/photo-gallery";
import { fleetUpload } from "@/features/fleet/components/fleet-upload";
import type { LocationUpdateInput } from "@/features/fleet/schemas";
import type { Dictionary } from "@/lib/i18n";
import type { FleetCommon } from "@/features/fleet/components/strings";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { googleMapsUrl } from "@/lib/geo";
import {
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../_components/properties";
import { DetailTitle } from "../../../_components/detail-title";
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
import { EditableText } from "../../../_components/editable-text";
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
  common: FleetCommon;
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
  ) => (
    <DetailSection title={label}>
      <EditableText
        editable={canManage}
        markdown={markdown}
        maxLength={5_000}
        value={location[key]}
        label={label}
        placeholder={placeholder}
        onSave={(next) => save({ [key]: next })}
        labels={field}
      />
    </DetailSection>
  );

  const remove =
    !canManage || location.isDefault ? null : isPool ? (
      <ConfirmDeleteDialog
        variant="icon"
        name={location.name}
        locale={language}
        labels={{ ...detail.deletePool, errors: common.errors }}
        cancel={strings.cancel}
        action={archiveLocationAction}
        input={location.id}
        redirectTo={backHref}
      />
    ) : (
      <ConfirmButton
        iconOnly
        variant="ghost"
        icon={<Trash2 aria-hidden />}
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
        className="size-8 text-ink-soft hover:bg-red-tint hover:text-red"
      />
    );

  return (
    <DetailEditorShell
      header={
        <DetailHeader
          media={<DetailMediaIcon icon={isPool ? Warehouse : MapPin} />}
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
            <DetailHeaderActions
              saveStatus={
                canManage
                  ? { labels: strings.status, words: language }
                  : undefined
              }
            >
              {remove}
            </DetailHeaderActions>
          }
        >
          <DetailMeta>
            <MetaBadge>{common.kinds[location.kind]}</MetaBadge>
            {location.isDefault ? (
              <MetaBadge className="bg-mint">{strings.isDefault}</MetaBadge>
            ) : null}
            {location.ownerName}
            {location.trishawCount}
          </DetailMeta>
        </DetailHeader>
      }
      panels={
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
            {canManage && location.isDefault ? (
              <p className="text-xs text-ink-soft">{detail.defaultHint}</p>
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

          {canManage ? null : <DetailNotice>{detail.readOnly}</DetailNotice>}
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

      {richField(
        "accessNotes",
        detail.accessNotes,
        detail.accessNotesPlaceholder,
      )}
      {richField(
        "returnInstructions",
        detail.returnInstructions,
        detail.returnInstructionsPlaceholder,
      )}

      <DetailSection title={detail.entrance}>
        <EditableText
          editable={canManage}
          maxLength={500}
          value={location.entrance}
          label={detail.entrance}
          placeholder={detail.entrancePlaceholder}
          onSave={(next) => save({ entrance: next })}
          labels={field}
        />
        {canManage || location.entrancePhotoFileId ? (
          <PhotoGallery
            kind="entrancePhoto"
            upload={fleetUpload("entrancePhoto")}
            locale={language}
            max={1}
            readOnly={!canManage}
            value={
              location.entrancePhotoFileId ? [location.entrancePhotoFileId] : []
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
          <DetailEmpty>{detail.noEntrancePhoto}</DetailEmpty>
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
          <DetailList>
            {trishaws.map((trishaw) => (
              <DetailListRow
                key={trishaw.id}
                href={trishaw.href}
              >
                <Bike
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {trishaw.name}
                </span>
                <span className="text-ink-soft">{trishaw.status}</span>
              </DetailListRow>
            ))}
          </DetailList>
        ) : (
          <DetailEmpty>{detail.noTrishaws}</DetailEmpty>
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
    </DetailEditorShell>
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
  common: FleetCommon;
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
        strings={{
          map: strings.map,
          address: { ...common.address, ...strings.address },
        }}
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
