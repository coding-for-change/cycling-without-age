"use client";

import { useId, useTransition } from "react";
import {
  Accessibility,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify, type ActionResult } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import type { InlineFieldLabels } from "@/components/inline-field";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import {
  deleteTypeAction,
  promoteTypeAction,
  setTypeArchivedAction,
  setTypePhotosAction,
  updateTypeAction,
} from "@/features/fleet/actions";
import { FileThumb } from "@/features/fleet/components/file-image";
import { fileUrl } from "@/lib/storage/file-url";
import {
  ManualField,
  type ManualFieldLabels,
} from "@/features/fleet/components/manual-field";
import {
  PhotoGallery,
  type PhotoGalleryLabels,
} from "@/components/photo-gallery/photo-gallery";
import { fleetUpload } from "@/features/fleet/components/fleet-upload";
import type { TypeUpdateInput } from "@/features/fleet/schemas";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  DETAIL_MEDIA,
  DetailEditorShell,
  DetailEmpty,
  DetailHeader,
  DetailHeaderActions,
  DetailMeta,
  DetailNotice,
  DetailSection,
  MetaBadge,
} from "../../../../_components/detail-page";
import { DetailTitle } from "../../../../_components/detail-title";
import { EditableText } from "../../../../_components/editable-text";
import {
  OptimisticPropertySelect,
  PropertySwitch,
} from "../../../../_components/optimistic-properties";
import {
  PROPERTY_BUTTON,
  PropertyList,
  PropertyRow,
  PropertyValue,
} from "../../../../_components/properties";
import { SidePanel } from "../../../../_components/side-panel";

export type TypeDetailData = {
  id: string;
  name: string;
  description: string | null;
  seats: number;
  wheelchair: boolean;
  photoFileId: string | null;
  photoFileIds: string[];
  manualFileId: string | null;
  archived: boolean;
  scopeLabel: string;
  ownerName: string | null;
  usage: string;
  inUse: boolean;
};

export type TypeDetailLabels = {
  description: string;
  descriptionPlaceholder: string;
  manual: string;
  noManual: string;
  photos: string;
  photoHint: string;
  manualHint: string;
  properties: string;
  name: string;
  seats: string;
  wheelchair: string;
  catalogue: string;
  readOnly: string;
  promoteHint: string;
  promoteDone: string;
  archive: string;
  restore: string;
  archiveHint: string;
  archivedDone: string;
  restoredDone: string;
  archivedBadge: string;
  deleteBlocked: string;
  photoAlt: string;
  wheelchairYes: string;
  wheelchairNo: string;
  seatOptions: { value: number; label: string }[];
  delete: Omit<ConfirmDeleteLabels, "errors">;
  cancel: string;
  field: InlineFieldLabels;
  status: { saving: string; saved: string };
  gallery: PhotoGalleryLabels;
  markdown: MarkdownToolLabels;
  manualLabels: ManualFieldLabels;
};

export function TypeDetail({
  type,
  canManage,
  promoteLabel,
  backHref,
  language,
  labels,
}: {
  type: TypeDetailData;
  canManage: boolean;
  promoteLabel: string | null;
  backHref: string;
  language: Locale;
  labels: TypeDetailLabels;
}) {
  const ids = { seats: useId(), wheelchair: useId() };
  const save = (input: TypeUpdateInput): Promise<ActionResult> =>
    updateTypeAction(type.id, input);
  const errors = labels.field.errors;
  const photoAlt = formatMessage(
    labels.photoAlt,
    { name: type.name },
    language,
  );

  const header = (
    <DetailHeader
      media={
        <FileThumb
          fileId={type.photoFileId}
          alt={photoAlt}
          className={DETAIL_MEDIA}
        />
      }
      title={
        <DetailTitle
          value={type.name}
          label={labels.name}
          maxLength={80}
          onSave={canManage ? (next) => save({ name: next }) : undefined}
          labels={labels.field}
        />
      }
      aside={
        canManage ? (
          <DetailHeaderActions
            saveStatus={{ labels: labels.status, words: language }}
          >
            <ConfirmDeleteDialog
              variant="icon"
              name={type.name}
              locale={language}
              labels={{ ...labels.delete, errors }}
              cancel={labels.cancel}
              action={deleteTypeAction}
              input={type.id}
              redirectTo={backHref}
              blocked={type.inUse ? labels.deleteBlocked : undefined}
            />
          </DetailHeaderActions>
        ) : undefined
      }
    >
      <DetailMeta>
        <MetaBadge>{type.scopeLabel}</MetaBadge>
        {type.archived ? (
          <MetaBadge className="border-line bg-transparent text-ink-soft">
            {labels.archivedBadge}
          </MetaBadge>
        ) : null}
        {type.ownerName}
        {type.usage}
      </DetailMeta>
    </DetailHeader>
  );

  const panels = (
    <>
      <SidePanel title={labels.properties}>
        <PropertyList>
          <PropertyRow
            label={labels.seats}
            htmlFor={canManage ? ids.seats : undefined}
          >
            {canManage ? (
              <OptimisticPropertySelect
                id={ids.seats}
                value={String(type.seats)}
                options={labels.seatOptions.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
                onSave={(next) => save({ seats: Number(next) })}
                labels={labels.field}
              />
            ) : (
              <PropertyValue>
                {labels.seatOptions.find((o) => o.value === type.seats)
                  ?.label ?? String(type.seats)}
              </PropertyValue>
            )}
          </PropertyRow>
          <PropertyRow
            label={labels.wheelchair}
            htmlFor={canManage ? ids.wheelchair : undefined}
          >
            {canManage ? (
              <PropertySwitch
                id={ids.wheelchair}
                value={type.wheelchair}
                label={labels.wheelchair}
                icon={Accessibility}
                onSave={(wheelchairAccessible) =>
                  save({ wheelchairAccessible })
                }
                labels={labels.field}
              />
            ) : (
              <PropertyValue>
                {type.wheelchair ? labels.wheelchairYes : labels.wheelchairNo}
              </PropertyValue>
            )}
          </PropertyRow>
          <PropertyRow label={labels.catalogue}>
            <PropertyValue>
              {type.ownerName
                ? `${type.scopeLabel} · ${type.ownerName}`
                : type.scopeLabel}
            </PropertyValue>
          </PropertyRow>
        </PropertyList>
        {canManage ? (
          <div className="grid gap-2">
            <ArchiveButton
              typeId={type.id}
              name={type.name}
              archived={type.archived}
              labels={labels}
              language={language}
            />
            <p className="text-xs text-ink-soft">{labels.archiveHint}</p>
          </div>
        ) : null}
      </SidePanel>

      {promoteLabel ? (
        <SidePanel title={labels.catalogue}>
          <div className="grid gap-2">
            <ConfirmButton
              icon={<ArrowUpRight aria-hidden />}
              label={promoteLabel}
              title={promoteLabel}
              body={labels.promoteHint}
              confirm={promoteLabel}
              cancel={labels.cancel}
              done={formatMessage(
                labels.promoteDone,
                { name: type.name },
                language,
              )}
              errors={errors}
              action={() => promoteTypeAction(type.id)}
              className={PROPERTY_BUTTON}
            />
            <p className="text-xs text-ink-soft">{labels.promoteHint}</p>
          </div>
        </SidePanel>
      ) : null}

      {canManage ? null : <DetailNotice>{labels.readOnly}</DetailNotice>}
    </>
  );

  return (
    <DetailEditorShell
      header={header}
      panels={panels}
    >
      <DetailSection title={labels.description}>
        {canManage || type.description ? (
          <EditableText
            editable={canManage}
            markdown={labels.markdown}
            maxLength={10_000}
            value={type.description}
            label={labels.description}
            placeholder={labels.descriptionPlaceholder}
            onSave={(next) => save({ description: next })}
            labels={labels.field}
          />
        ) : (
          <DetailEmpty>{labels.descriptionPlaceholder}</DetailEmpty>
        )}
      </DetailSection>

      <DetailSection
        title={labels.photos}
        description={canManage ? labels.photoHint : undefined}
      >
        {canManage || type.photoFileIds.length ? (
          <PhotoGallery
            kind="typePhoto"
            upload={fleetUpload("typePhoto")}
            locale={language}
            value={type.photoFileIds}
            readOnly={!canManage}
            alt={photoAlt}
            labels={labels.gallery}
            onChange={(fileIds) => setTypePhotosAction(type.id, fileIds)}
          />
        ) : (
          <DetailEmpty>{labels.gallery.hint}</DetailEmpty>
        )}
      </DetailSection>

      <DetailSection
        title={labels.manual}
        description={canManage ? labels.manualHint : undefined}
      >
        {canManage ? (
          <ManualField
            value={type.manualFileId}
            labels={labels.manualLabels}
            onChange={async (manualFileId) => {
              notify(await save({ manualFileId }), {
                done: labels.field.saved,
                errors,
              });
            }}
          />
        ) : type.manualFileId ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-fit"
          >
            <a
              href={fileUrl(type.manualFileId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText aria-hidden />
              {labels.manualLabels.open}
            </a>
          </Button>
        ) : (
          <DetailEmpty>{labels.noManual}</DetailEmpty>
        )}
      </DetailSection>
    </DetailEditorShell>
  );
}

function ArchiveButton({
  typeId,
  name,
  archived,
  labels,
  language,
}: {
  typeId: string;
  name: string;
  archived: boolean;
  labels: TypeDetailLabels;
  language: string;
}) {
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      notify(await setTypeArchivedAction(typeId, !archived), {
        done: formatMessage(
          archived ? labels.restoredDone : labels.archivedDone,
          { name },
          language,
        ),
        errors: labels.field.errors,
      });
    });

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={toggle}
      className={PROPERTY_BUTTON}
    >
      {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
      {archived ? labels.restore : labels.archive}
    </Button>
  );
}
