"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Accessibility,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { notify, type ActionResult } from "@/components/action-feedback";
import { ConfirmButton } from "@/components/confirm-button";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { RichText } from "@/components/markdown";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  deleteTypeAction,
  promoteTypeAction,
  setTypeArchivedAction,
  setTypePhotosAction,
  updateTypeAction,
} from "@/features/fleet/actions";
import { FileThumb, fileUrl } from "@/features/fleet/components/file-image";
import {
  ManualField,
  type ManualFieldLabels,
} from "@/features/fleet/components/manual-field";
import {
  PhotoGallery,
  type PhotoGalleryLabels,
} from "@/features/fleet/components/photo-gallery";
import type { TypeUpdateInput } from "@/features/fleet/schemas";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  DetailHeader,
  DetailLayout,
  DetailSection,
} from "../../../../_components/detail-page";
import { DetailTitle } from "../../../../_components/detail-title";
import {
  PROPERTY_BUTTON,
  PropertyList,
  PropertyRow,
  PropertySelect,
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
  manage: string;
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
  const router = useRouter();
  const save = (input: TypeUpdateInput): Promise<ActionResult> =>
    updateTypeAction(type.id, input);
  const errors = labels.field.errors;

  const header = (
    <DetailHeader
      media={
        <FileThumb
          fileId={type.photoFileId}
          alt={formatMessage(labels.photoAlt, { name: type.name }, language)}
          size="lg"
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
          <SaveStatus
            labels={labels.status}
            words={language}
          />
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-2sm text-ink-soft">
        <Badge className="bg-mint-tint font-normal text-ink">
          {type.scopeLabel}
        </Badge>
        {type.ownerName ? <span>{type.ownerName}</span> : null}
        {type.archived ? (
          <Badge
            variant="outline"
            className="border-line font-normal text-ink-soft"
          >
            {labels.archivedBadge}
          </Badge>
        ) : null}
        <span>·</span>
        <span>{type.usage}</span>
      </div>
    </DetailHeader>
  );

  const properties = (
    <>
      <SidePanel title={labels.properties}>
        <PropertyList>
          <PropertyRow label={labels.seats}>
            {canManage ? (
              <SeatsSelect
                value={type.seats}
                options={labels.seatOptions}
                labels={labels.field}
                onSave={(seats) => save({ seats })}
              />
            ) : (
              <PropertyValue>
                {labels.seatOptions.find((o) => o.value === type.seats)
                  ?.label ?? String(type.seats)}
              </PropertyValue>
            )}
          </PropertyRow>
          <PropertyRow label={labels.wheelchair}>
            {canManage ? (
              <WheelchairToggle
                value={type.wheelchair}
                label={labels.wheelchair}
                labels={labels.field}
                onSave={(wheelchairAccessible) =>
                  save({ wheelchairAccessible })
                }
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
      </SidePanel>

      {promoteLabel || !canManage ? (
        <SidePanel title={labels.catalogue}>
          {promoteLabel ? (
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
              <p className="text-2sm text-ink-soft">{labels.promoteHint}</p>
            </div>
          ) : null}
          {!canManage ? (
            <p className="text-2sm text-ink-soft">{labels.readOnly}</p>
          ) : null}
        </SidePanel>
      ) : null}

      {canManage ? (
        <SidePanel title={labels.manage}>
          <div className="grid gap-2">
            <ArchiveButton
              typeId={type.id}
              name={type.name}
              archived={type.archived}
              labels={labels}
              language={language}
            />
            <p className="text-2sm text-ink-soft">{labels.archiveHint}</p>
          </div>
          {type.inUse ? (
            <p className="text-2sm text-ink-soft">{labels.deleteBlocked}</p>
          ) : (
            <ConfirmDeleteDialog
              name={type.name}
              locale={language}
              labels={{ ...labels.delete, errors }}
              cancel={labels.cancel}
              action={() => deleteTypeAction(type.id)}
              onDone={() => router.push(backHref)}
            />
          )}
        </SidePanel>
      ) : null}
    </>
  );

  return (
    <SaveStatusProvider>
      <DetailLayout
        header={header}
        sidebar={properties}
      >
        <DetailSection title={labels.description}>
          {canManage ? (
            <InlineField
              multiline
              maxLength={10_000}
              value={type.description}
              label={labels.description}
              placeholder={labels.descriptionPlaceholder}
              markdown={labels.markdown}
              display={(value) => <RichText text={value} />}
              onSave={(next) => save({ description: next })}
              labels={labels.field}
            />
          ) : type.description ? (
            <RichText text={type.description} />
          ) : (
            <p className="text-2sm text-ink-faint">
              {labels.descriptionPlaceholder}
            </p>
          )}
        </DetailSection>

        <DetailSection
          title={labels.photos}
          description={canManage ? labels.photoHint : undefined}
        >
          {canManage || type.photoFileIds.length ? (
            <PhotoGallery
              kind="typePhoto"
              locale={language}
              value={type.photoFileIds}
              readOnly={!canManage}
              alt={formatMessage(
                labels.photoAlt,
                { name: type.name },
                language,
              )}
              labels={labels.gallery}
              onChange={(fileIds) => setTypePhotosAction(type.id, fileIds)}
            />
          ) : (
            <p className="text-2sm text-ink-soft">{labels.gallery.hint}</p>
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
            <p className="text-2sm text-ink-soft">{labels.noManual}</p>
          )}
        </DetailSection>
      </DetailLayout>
    </SaveStatusProvider>
  );
}

function SeatsSelect({
  value,
  options,
  labels,
  onSave,
}: {
  value: number;
  options: { value: number; label: string }[];
  labels: InlineFieldLabels;
  onSave: (next: number) => Promise<ActionResult>;
}) {
  const { shown, persist } = useOptimisticSave(value, onSave, labels);
  return (
    <PropertySelect
      value={String(shown)}
      options={options.map((option) => ({
        value: String(option.value),
        label: option.label,
      }))}
      onChange={(next) => {
        const seats = Number(next);
        if (seats !== shown) void persist(seats, shown);
      }}
    />
  );
}

function WheelchairToggle({
  value,
  label,
  labels,
  onSave,
}: {
  value: boolean;
  label: string;
  labels: InlineFieldLabels;
  onSave: (next: boolean) => Promise<ActionResult>;
}) {
  const { shown, persist } = useOptimisticSave(value, onSave, labels);
  return (
    <div className="flex h-8 items-center gap-2">
      <Accessibility
        aria-hidden
        className="size-3.5 text-ink-soft"
      />
      <Switch
        size="sm"
        aria-label={label}
        checked={shown}
        onCheckedChange={(next) => void persist(next, !next)}
      />
    </div>
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
