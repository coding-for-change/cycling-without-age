import type { Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

export const trishawSummary = (
  trishaw: {
    id: string;
    name: string;
    photoFileId: string | null;
    type: {
      name: string;
      seats: number;
      photoFileId: string | null;
      wheelchairAccessible: boolean;
    } | null;
    storageLocation: { name: string; kind: "chapter" | "pool" };
  },
  dict: Dictionary,
  words: Locale,
) => ({
  id: trishaw.id,
  name: trishaw.name,
  photoFileId: trishaw.photoFileId ?? trishaw.type?.photoFileId ?? null,
  model: trishaw.type?.name ?? null,
  seats: trishaw.type
    ? formatMessage(
        dict.fleet.common.seats,
        { count: trishaw.type.seats },
        words,
      )
    : null,
  wheelchair: trishaw.type?.wheelchairAccessible ?? false,
  location: trishaw.storageLocation.name,
  isPool: trishaw.storageLocation.kind === "pool",
});
