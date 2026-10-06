"use client";

import { useId, useState, type ReactNode } from "react";
import { Accessibility, FileText } from "lucide-react";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SaveStatusProvider } from "@/components/save-status";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { RichText } from "@/components/markdown";
import {
  TRISHAW_STATUSES,
  type TrishawStatusName,
} from "@/features/fleet/schemas";
import {
  deleteTrishawAction,
  moveTrishawAction,
  setTrishawPhotosAction,
  setTrishawStatusAction,
  updateTrishawAction,
} from "@/features/fleet/actions";
import { FileThumb } from "@/features/fleet/components/file-image";
import { fileUrl } from "@/lib/storage/file-url";
import {
  LocationPicker,
  type LocationOption,
  type LocationPickerLabels,
} from "@/features/fleet/components/location-picker";
import {
  PhotoGallery,
  type PhotoGalleryLabels,
} from "@/components/photo-gallery/photo-gallery";
import { fleetUpload } from "@/features/fleet/components/fleet-upload";
import {
  TrishawDamageBadge,
  TrishawStatusBadge,
  type DamageState,
} from "@/features/fleet/components/trishaw-badges";
import {
  DamageClearDialog,
  type DamageClearLabels,
} from "@/features/fleet/components/damage-clear-dialog";
import {
  TypePicker,
  type TypeOption,
  type TypePickerLabels,
} from "@/features/fleet/components/type-picker";
import type { Locale } from "@/lib/i18n/locales";
import {
  DETAIL_MEDIA,
  DetailHeader,
  DetailHeaderActions,
  DetailLayout,
  DetailMeta,
  DetailSection,
} from "../../../_components/detail-page";
import { DetailTitle } from "../../../_components/detail-title";
import { EditableText } from "../../../_components/editable-text";
import { OptimisticPropertySelect } from "../../../_components/optimistic-properties";
import {
  PropertyList,
  PropertyRow,
  PropertyValue,
  QUIET_COMBOBOX,
} from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";

export type TrishawEditorLabels = {
  field: InlineFieldLabels;
  status: { saving: string; saved: string };
  statusLabel: string;
  model: string;
  location: string;
  name: string;
  note: string;
  notePlaceholder: string;
  photos: string;
  photoHint: string;
  about: string;
  frameNumber: string;
  frameNumberPlaceholder: string;
  seats: string;
  wheelchair: string;
  yes: string;
  no: string;
  manualLabel: string;
  manualOpen: string;
  modelDescription: string;
  noModel: string;
  pool: string;
  since: string;
  statuses: Record<TrishawStatusName, string>;
  grounded: string;
  damaged: string;
  typePicker: TypePickerLabels;
  locationPicker: LocationPickerLabels;
  gallery: PhotoGalleryLabels;
  delete: ConfirmDeleteLabels;
  clear: DamageClearLabels;
  cancel: string;
};

export type TrishawEditorProps = {
  trishaw: {
    id: string;
    name: string;
    status: TrishawStatusName;
    note: string | null;
    typeId: string | null;
    typeName: string | null;
    photoFileId: string | null;
    photoFileIds: string[];
    frameNumber: string | null;
    typePhotoFileId: string | null;
    locationId: string;
    locationName: string;
    isPool: boolean;
  };
  damage: {
    state: DamageState;
    count: number;
    grounding: { id: string; description: string }[];
  };
  model: {
    seats: string;
    wheelchair: boolean;
    manualFileId: string | null;
    description: string | null;
  } | null;
  canManage: boolean;
  consequences: string[];
  types: TypeOption[];
  locations: LocationOption[];
  backHref: string;
  language: Locale;
  labels: TrishawEditorLabels;
  panels: ReactNode;
  children: ReactNode;
};

export function TrishawEditor(props: TrishawEditorProps) {
  return (
    <SaveStatusProvider>
      <EditorLayout {...props} />
    </SaveStatusProvider>
  );
}

function EditorLayout({
  trishaw,
  damage,
  model,
  canManage,
  consequences,
  types,
  locations,
  backHref,
  language,
  labels,
  panels,
  children,
}: TrishawEditorProps) {
  const ids = { status: useId(), model: useId(), location: useId() };
  const { id } = trishaw;
  const addsFrame = canManage && trishaw.frameNumber === null;

  const [clearing, setClearing] = useState(false);
  const type = useOptimisticSave(
    trishaw.typeId,
    (next) => updateTrishawAction(id, { typeId: next }),
    labels.field,
  );
  const location = useOptimisticSave(
    trishaw.locationId,
    (next) => moveTrishawAction(id, next),
    labels.field,
  );

  return (
    <DetailLayout
      header={
        <DetailHeader
          media={
            <FileThumb
              fileId={trishaw.photoFileId ?? trishaw.typePhotoFileId}
              alt={trishaw.name}
              className={DETAIL_MEDIA}
            />
          }
          title={
            <DetailTitle
              value={trishaw.name}
              label={labels.name}
              maxLength={80}
              onSave={
                canManage
                  ? (next) => updateTrishawAction(id, { name: next })
                  : undefined
              }
              labels={labels.field}
            />
          }
          aside={
            <DetailHeaderActions
              saveStatus={
                canManage
                  ? { labels: labels.status, words: language }
                  : undefined
              }
            >
              {canManage ? (
                <ConfirmDeleteDialog
                  variant="icon"
                  name={trishaw.name}
                  consequences={consequences}
                  locale={language}
                  labels={labels.delete}
                  cancel={labels.cancel}
                  action={deleteTrishawAction}
                  input={id}
                  redirectTo={backHref}
                />
              ) : null}
            </DetailHeaderActions>
          }
        >
          {damage.state === "none" ? null : (
            <TrishawDamageBadge
              state={damage.state}
              label={
                damage.state === "grounded" ? labels.grounded : labels.damaged
              }
              count={damage.count}
            />
          )}
          <DetailMeta>
            {trishaw.typeName ?? labels.noModel}
            {trishaw.locationName}
            <span className="text-ink-faint">{labels.since}</span>
          </DetailMeta>
        </DetailHeader>
      }
      sidebar={
        <>
          <SidePanel title={labels.about}>
            <PropertyList>
              <PropertyRow
                label={labels.statusLabel}
                htmlFor={canManage ? ids.status : undefined}
              >
                {canManage ? (
                  <>
                    <OptimisticPropertySelect
                      id={ids.status}
                      value={trishaw.status}
                      options={TRISHAW_STATUSES.map((value) => ({
                        value,
                        label: labels.statuses[value],
                      }))}
                      onSave={(next) => setTrishawStatusAction(id, next)}
                      intercept={(next) => {
                        if (next !== "active" || damage.grounding.length === 0)
                          return false;
                        setClearing(true);
                        return true;
                      }}
                      display={(value) => (
                        <TrishawStatusBadge
                          status={value}
                          label={labels.statuses[value]}
                        />
                      )}
                      labels={labels.field}
                    />
                    <DamageClearDialog
                      damages={damage.grounding}
                      labels={labels.clear}
                      open={clearing}
                      onOpenChange={setClearing}
                      trigger={false}
                    />
                  </>
                ) : (
                  <TrishawStatusBadge
                    status={trishaw.status}
                    label={labels.statuses[trishaw.status]}
                  />
                )}
              </PropertyRow>
              <PropertyRow label={labels.frameNumber}>
                {addsFrame ? (
                  <InlineField
                    compact
                    maxLength={64}
                    value={null}
                    label={labels.frameNumber}
                    placeholder={labels.frameNumberPlaceholder}
                    onSave={(next) =>
                      updateTrishawAction(id, { frameNumber: next })
                    }
                    undoable={false}
                    labels={labels.field}
                    className="font-mono text-2sm"
                  />
                ) : (
                  <PropertyValue
                    muted={trishaw.frameNumber === null}
                    className="font-mono"
                  >
                    {trishaw.frameNumber ?? "–"}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={labels.model}
                htmlFor={canManage ? ids.model : undefined}
              >
                {canManage ? (
                  <TypePicker
                    id={ids.model}
                    types={types}
                    value={type.shown}
                    onChange={(next) => {
                      if (next !== type.shown)
                        void type.persist(next, type.shown);
                    }}
                    labels={labels.typePicker}
                    className={QUIET_COMBOBOX}
                  />
                ) : (
                  <PropertyValue muted={!trishaw.typeName}>
                    {trishaw.typeName ?? labels.noModel}
                  </PropertyValue>
                )}
              </PropertyRow>
              <PropertyRow
                label={labels.location}
                htmlFor={canManage ? ids.location : undefined}
              >
                {canManage ? (
                  <LocationPicker
                    id={ids.location}
                    locations={locations}
                    value={location.shown}
                    onChange={(next) => {
                      if (next !== location.shown)
                        void location.persist(next, location.shown);
                    }}
                    labels={labels.locationPicker}
                    className={QUIET_COMBOBOX}
                  />
                ) : (
                  <PropertyValue>
                    {trishaw.locationName}
                    {trishaw.isPool ? ` · ${labels.pool}` : ""}
                  </PropertyValue>
                )}
              </PropertyRow>
              {model ? (
                <>
                  <PropertyRow label={labels.seats}>
                    <PropertyValue>{model.seats}</PropertyValue>
                  </PropertyRow>
                  <PropertyRow label={labels.wheelchair}>
                    <PropertyValue
                      icon={model.wheelchair ? Accessibility : undefined}
                    >
                      {model.wheelchair ? labels.yes : labels.no}
                    </PropertyValue>
                  </PropertyRow>
                  {model.manualFileId ? (
                    <PropertyRow label={labels.manualLabel}>
                      <a
                        href={fileUrl(model.manualFileId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.25 py-1.5 underline-offset-2 hover:underline"
                      >
                        <FileText
                          aria-hidden
                          className="size-3.5"
                        />
                        {labels.manualOpen}
                      </a>
                    </PropertyRow>
                  ) : null}
                </>
              ) : null}
            </PropertyList>
            {model?.description ? (
              <div className="grid gap-1 border-t border-line pt-3">
                <span className="text-xs font-medium text-ink-soft">
                  {labels.modelDescription}
                </span>
                <RichText
                  text={model.description}
                  className="text-ink-soft"
                />
              </div>
            ) : null}
          </SidePanel>

          {panels}
        </>
      }
    >
      {canManage || trishaw.photoFileIds.length ? (
        <DetailSection
          title={labels.photos}
          description={canManage ? labels.photoHint : undefined}
        >
          <PhotoGallery
            kind="trishawPhoto"
            upload={fleetUpload("trishawPhoto")}
            locale={language}
            value={trishaw.photoFileIds}
            readOnly={!canManage}
            alt={trishaw.name}
            labels={labels.gallery}
            onChange={(fileIds) => setTrishawPhotosAction(id, fileIds)}
          />
        </DetailSection>
      ) : null}
      <DetailSection title={labels.note}>
        <EditableText
          editable={canManage}
          multiline
          maxLength={2000}
          value={trishaw.note}
          label={labels.note}
          placeholder={labels.notePlaceholder}
          onSave={(next) => updateTrishawAction(id, { note: next })}
          labels={labels.field}
        />
      </DetailSection>
      {children}
    </DetailLayout>
  );
}
