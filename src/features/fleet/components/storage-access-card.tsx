import { DoorOpen, ExternalLink, KeyRound, MapPin } from "lucide-react";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { googleMapsUrl } from "@/lib/geo";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/format";
import type { LocationRow } from "../facade";
import { FileImage } from "./file-image";

export type StorageAccessLabels = {
  openInMaps: string;
  accessCode: string;
  entrance: string;
  entrancePhoto: string;
  accessNotes: string;
  returnInstructions: string;
  pool: string;
};

/**
 * Where a trishaw waits and how to get in: the place, the access code, the
 * entrance and its notes. The finish page adds how to bring it back; the
 * pilot's ride page shows the rest from a day before the ride.
 */
export function StorageAccessCard({
  location,
  pool,
  withReturn,
  labels,
  words,
}: {
  location: Pick<
    LocationRow,
    | "name"
    | "address"
    | "latitude"
    | "longitude"
    | "accessCode"
    | "entrance"
    | "entrancePhotoFileId"
    | "accessNotes"
    | "returnInstructions"
  >;
  pool: boolean;
  withReturn: boolean;
  labels: StorageAccessLabels;
  words: Locale;
}) {
  const maps = googleMapsUrl(location);

  return (
    <>
      <div className="flex items-start gap-3">
        <MapPin
          aria-hidden
          className="text-mint-ink mt-0.5 size-4 shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">
            {location.name}
            {pool ? (
              <Badge
                variant="outline"
                className="border-line text-ink-soft ml-2 align-middle"
              >
                {labels.pool}
              </Badge>
            ) : null}
          </p>
          {location.address ? (
            <p className="text-2sm text-ink-soft">{location.address}</p>
          ) : null}
          {maps ? (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2sm inline-flex min-h-11 w-fit items-center gap-1.25 font-medium underline underline-offset-2"
            >
              <ExternalLink
                aria-hidden
                className="size-3.5"
              />
              {labels.openInMaps}
            </a>
          ) : null}
        </div>
      </div>

      {location.accessCode ? (
        <div className="bg-mint-tint flex items-center gap-3 rounded-xl p-4">
          <KeyRound
            aria-hidden
            className="text-ink size-5 shrink-0"
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-2sm text-ink-soft">{labels.accessCode}</p>
            <p className="font-display text-3xl font-bold tracking-widest tabular-nums select-all">
              {location.accessCode}
            </p>
          </div>
        </div>
      ) : null}

      {location.entrance || location.entrancePhotoFileId ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-1.25 text-sm font-medium">
            <DoorOpen
              aria-hidden
              className="size-4"
            />
            {labels.entrance}
          </p>
          {location.entrance ? (
            <p className="text-2sm">{location.entrance}</p>
          ) : null}
          {location.entrancePhotoFileId ? (
            <FileImage
              fileId={location.entrancePhotoFileId}
              alt={formatMessage(
                labels.entrancePhoto,
                { location: location.name },
                words,
              )}
              className="aspect-video w-full rounded-xl"
            />
          ) : null}
        </div>
      ) : null}

      {location.accessNotes?.trim() ? (
        <div className="flex flex-col gap-1.25">
          <p className="text-sm font-medium">{labels.accessNotes}</p>
          <RichText text={location.accessNotes} />
        </div>
      ) : null}

      {withReturn && location.returnInstructions?.trim() ? (
        <div className="flex flex-col gap-1.25">
          <p className="text-sm font-medium">{labels.returnInstructions}</p>
          <RichText text={location.returnInstructions} />
        </div>
      ) : null}
    </>
  );
}
