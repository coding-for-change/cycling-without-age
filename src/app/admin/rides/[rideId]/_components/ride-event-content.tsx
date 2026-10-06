"use client";

import { startTransition, useOptimistic } from "react";
import { reportSave } from "@/components/action-feedback";
import type { InlineFieldLabels } from "@/components/inline-field";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { useSaveStatus } from "@/components/save-status";
import {
  setRidePhotosAction,
  updateRideAction,
} from "@/features/rides/actions";
import {
  PhotoGallery,
  type PhotoGalleryLabels,
} from "@/components/photo-gallery/photo-gallery";
import { ridePhotoUpload } from "@/features/rides/components/ride-photo-upload";
import {
  RIDE_DESCRIPTION_MAX,
  RIDE_MAX_PHOTOS,
} from "@/features/rides/schemas";
import type { Locale } from "@/lib/i18n/locales";
import { EditableText } from "../../../_components/editable-text";

export function RideEventContent({
  rideId,
  description,
  photos,
  editable,
  language,
  labels,
}: {
  rideId: string;
  description: string | null;
  photos: string[];
  editable: boolean;
  language: Locale;
  labels: {
    description: string;
    placeholder: string;
    photos: string;
    field: InlineFieldLabels;
    markdown: MarkdownToolLabels;
    gallery: PhotoGalleryLabels;
  };
}) {
  const report = useSaveStatus();
  const [shown, show] = useOptimistic(photos);

  const persist = (fileIds: string[]) => {
    report("saving");
    return setRidePhotosAction({ rideId, fileIds });
  };

  const undo = (previous: string[]) =>
    startTransition(async () => {
      show(previous);
      reportSave(await persist(previous), {
        report,
        labels: labels.field,
        undoing: true,
      });
    });

  const savePhotos = async (next: string[], previous: string[]) => {
    const result = await persist(next);
    if (result.ok)
      reportSave(result, {
        report,
        labels: labels.field,
        undo: () => undo(previous),
      });
    else report("failed");
    return result;
  };

  return (
    <section className="grid gap-4">
      {editable || description ? (
        <EditableText
          editable={editable}
          maxLength={RIDE_DESCRIPTION_MAX}
          value={description}
          label={labels.description}
          placeholder={labels.placeholder}
          markdown={labels.markdown}
          onSave={(next) => updateRideAction(rideId, { description: next })}
          labels={labels.field}
          className="text-sm"
        />
      ) : null}
      {editable || shown.length > 0 ? (
        <div className="grid gap-2">
          <h3 className="text-xs font-medium text-ink-soft">{labels.photos}</h3>
          <PhotoGallery
            kind="ridePhoto"
            upload={ridePhotoUpload}
            value={shown}
            onChange={savePhotos}
            alt={labels.photos}
            labels={labels.gallery}
            max={RIDE_MAX_PHOTOS}
            locale={language}
            readOnly={!editable}
            sortable
          />
        </div>
      ) : null}
    </section>
  );
}
