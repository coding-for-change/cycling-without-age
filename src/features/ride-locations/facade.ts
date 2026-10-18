import { DomainError } from "@/lib/domain-error";
import { rideLocationInput, rideLocationUpdateInput } from "./schemas";
import type {
  RideLocationInput,
  RideLocationKind,
  RideLocationUpdateInput,
} from "./schemas";
import {
  countRideLocations,
  findRideLocationCountries,
  findRideLocationById,
  findRideLocationChapter,
  findRideLocations,
  insertRideLocation,
  updateRideLocationById,
  type RideLocationRecord,
} from "./services/ride-locations";

export type RideLocation = {
  id: string;
  chapterId: string;
  chapterName: string;
  timeZone: string;
  kind: RideLocationKind;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  typicalRideKm: number | null;
  defaultMinutes: number | null;
  archivedAt: Date | null;
  createdAt: Date;
};

const toRideLocation = (record: RideLocationRecord): RideLocation => ({
  id: record.id,
  chapterId: record.chapterId,
  chapterName: record.chapter.name,
  timeZone: record.chapter.timeZone,
  kind: record.kind,
  name: record.name,
  address: record.address,
  latitude: record.latitude,
  longitude: record.longitude,
  contactName: record.contactName,
  contactPhone: record.contactPhone,
  contactEmail: record.contactEmail,
  notes: record.notes,
  typicalRideKm: record.typicalRideKm?.toNumber() ?? null,
  defaultMinutes: record.defaultMinutes,
  archivedAt: record.archivedAt,
  createdAt: record.createdAt,
});

export async function listRideLocations(
  chapterIds: string[],
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<RideLocation[]> {
  if (!chapterIds.length) return [];
  return (await findRideLocations(chapterIds, includeArchived)).map(
    toRideLocation,
  );
}

export async function getRideLocation(id: string) {
  const record = await findRideLocationById(id);
  return record ? toRideLocation(record) : null;
}

export async function rideLocationChapterId(id: string) {
  return (await findRideLocationChapter(id))?.chapterId ?? null;
}

export async function requireUsableRideLocation(id: string, chapterId: string) {
  const location = await getRideLocation(id);
  if (!location || location.archivedAt)
    throw new DomainError("unknownLocation");
  if (location.chapterId !== chapterId)
    throw new DomainError("locationNotInChapter");
  return location;
}

export async function requireCareCenter(id: string, chapterId: string) {
  const location = await requireUsableRideLocation(id, chapterId);
  if (location.kind === "publicPlace")
    throw new DomainError("locationNotCareCenter");
  return location;
}

export async function createRideLocation(input: RideLocationInput) {
  const data = rideLocationInput.parse(input);
  return toRideLocation(await insertRideLocation(data));
}

async function requireLocation(id: string) {
  const location = await findRideLocationChapter(id);
  if (!location) throw new DomainError("unknownLocation");
  return location;
}

export async function updateRideLocation(
  id: string,
  input: RideLocationUpdateInput,
) {
  const data = rideLocationUpdateInput.parse(input);
  const location = await requireLocation(id);
  if (location.archivedAt) throw new DomainError("locationArchived");
  return toRideLocation(await updateRideLocationById(id, data));
}

export async function archiveRideLocation(id: string, now = new Date()) {
  const location = await requireLocation(id);
  if (location.archivedAt) return;
  await updateRideLocationById(id, { archivedAt: now });
}

export async function restoreRideLocation(id: string) {
  const location = await requireLocation(id);
  if (!location.archivedAt) return;
  await updateRideLocationById(id, { archivedAt: null });
}

export const countChapterRideLocations = (chapterId: string) =>
  countRideLocations({ chapterId });

export async function countCountryRideLocations(countryIds: string[]) {
  const counts = new Map<string, number>();
  if (!countryIds.length) return counts;
  for (const { chapter } of await findRideLocationCountries(countryIds))
    counts.set(chapter.countryId, (counts.get(chapter.countryId) ?? 0) + 1);
  return counts;
}
