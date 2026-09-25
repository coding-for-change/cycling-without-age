import { randomInt } from "node:crypto";
import { DomainError, isUniqueViolation, mapping } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import {
  allowsAdmin,
  hasChapterRole,
  type Access,
  type AdminAuthority,
  type ChapterRole,
} from "@/lib/access";
import {
  commitUpload as commitStoredObject,
  prepareUpload,
  type FileKind,
} from "@/lib/storage";
import {
  POOL_CODE_ALPHABET,
  chapterLocationInput,
  damageClearInput,
  damageReportInput,
  locationUpdateInput,
  ownerKey,
  photoIds,
  poolCode,
  poolDecisionInput,
  poolInput,
  trishawCreateInput,
  trishawNoteInput,
  trishawStatusInput,
  trishawUpdateInput,
  typeCreateInput,
  typeSearchInput,
  typeUpdateInput,
  uploadCommitInput,
  uploadRequestInput,
  type ChapterLocationInput,
  type DamageClearInput,
  type DamageReportInput,
  type LocationUpdateInput,
  type PoolDecisionInput,
  type PoolInput,
  type TrishawCreateInput,
  type TrishawNoteInput,
  type TrishawStatusName,
  type TrishawUpdateInput,
  type TypeCreateInput,
  type TypeOwner,
  type TypeSearchInput,
  type TypeUpdateInput,
} from "./schemas";
import {
  clearDamageById,
  countOpenGroundingDamages,
  findDamageById,
  findDamagesOfRide,
  findDamagesOfTrishaw,
  insertDamage,
  type DamageRow,
} from "./services/damages";
import {
  findFileOwners,
  findStoredFileById,
  insertStoredFile,
} from "./services/files";
import {
  deleteLocationById,
  findDefaultLocation,
  findLocationById,
  findLocations,
  findPoolByCode,
  insertLocation,
  reachableLocationWhere,
  updateLocationById,
  type LocationRow,
} from "./services/locations";
import { findLogOfTrishaw, insertLogEntry, type LogRow } from "./services/log";
import {
  deleteMembership,
  findMembership,
  findMembershipById,
  findMembershipsOfChapters,
  setMembershipDecision,
  upsertMembershipRequest,
  type PoolMembershipRow,
} from "./services/memberships";
import {
  deleteTrishawById,
  findTrishawById,
  findTrishawIdsAt,
  findTrishawsByIds,
  findTrishawsOfChapters,
  insertTrishaw,
  replaceTrishawPhotos,
  updateTrishawById,
  type TrishawRow,
} from "./services/trishaws";
import {
  deleteTypeById,
  findTypeById,
  findTypes,
  insertType,
  replaceTypePhotos,
  updateTypeById,
  type TrishawTypeRow,
} from "./services/types";

export type {
  DamageRow,
  LocationRow,
  LogRow,
  PoolMembershipRow,
  TrishawRow,
  TrishawTypeRow,
};

export type Authority = AdminAuthority;

const NO_ONE: Authority = { chapters: [], countryIds: [] };

const whenAny = <T>(ids: string[], find: (ids: string[]) => Promise<T[]>) =>
  ids.length ? find(ids) : Promise.resolve([]);

const galleryCreate = (fileIds: string[]) => ({
  photoFileId: fileIds[0] ?? null,
  photos: {
    create: fileIds.map((fileId, position) => ({ fileId, position })),
  },
});

async function assertNewPhotosOwned(
  current: { fileId: string }[],
  fileIds: string[],
  actorUserId: string,
  kind: FileKind,
) {
  const kept = new Set(current.map((photo) => photo.fileId));
  for (const fileId of fileIds.filter((fileId) => !kept.has(fileId)))
    await ownFile(fileId, actorUserId, kind);
}

async function ownFile(
  fileId: string | null | undefined,
  userId: string,
  kind: FileKind,
) {
  if (!fileId) return;
  const file = await findStoredFileById(fileId);
  if (!file || file.kind !== kind || file.uploadedByUserId !== userId)
    throw new DomainError("invalidFile");
}

export async function requestUpload(userId: string, input: unknown) {
  const { kind, mime, size } = uploadRequestInput.parse(input);
  const prepared = await prepareUpload(userId, kind, mime, size);
  if (!prepared) throw new DomainError("uploadRejected");
  return prepared;
}

export async function commitUpload(userId: string, input: unknown) {
  const { kind, key } = uploadCommitInput.parse(input);
  const stored = await commitStoredObject(userId, kind, key);
  if (!stored) throw new DomainError("uploadRejected");
  const file = await insertStoredFile({
    ...stored,
    kind,
    uploadedByUserId: userId,
  });
  return { id: file.id, mime: file.mime };
}

const reachingChapterIds = (location: {
  ownerChapterId: string | null;
  chapters: { chapterId: string; status?: string }[];
}) => [
  ...(location.ownerChapterId ? [location.ownerChapterId] : []),
  ...location.chapters
    .filter((link) => link.status === undefined || link.status === "approved")
    .map((link) => link.chapterId),
];

const isMemberOfAny = (
  access: Access,
  chapterIds: string[],
  roles: ChapterRole[],
) =>
  chapterIds.some((chapterId) =>
    roles.some((role) => hasChapterRole(access, chapterId, role)),
  );

/**
 * Product photos and manuals are catalogue material, so any signed-in person
 * may read them. What a location or a damage shows is not: an entrance photo
 * tells a stranger how to get to the bikes.
 */
export async function readableFile(
  fileId: string,
  userId: string,
  access: Access,
) {
  const file = await findFileOwners(fileId);
  if (!file) return null;

  const location = async (id: string | undefined) =>
    id ? findLocationById(id) : null;

  if (file.kind === "typePhoto" || file.kind === "typeManual") return file;

  if (file.kind === "trishawPhoto" || file.kind === "entrancePhoto") {
    const locationId =
      file.kind === "trishawPhoto"
        ? (file.trishawPhotos[0]?.storageLocationId ??
          file.trishawGallery[0]?.trishaw.storageLocationId)
        : file.entrancePhotos[0]?.id;
    const site = await location(locationId);
    if (!site) return file.uploadedByUserId === userId ? file : null;
    const authority = locationAuthorityOf(site);
    const roles: ChapterRole[] =
      file.kind === "entrancePhoto"
        ? ["admin", "pilot"]
        : ["admin", "pilot", "passenger"];
    return isMemberOfAny(access, reachingChapterIds(site), roles) ||
      allowsAdmin(access, authority)
      ? file
      : null;
  }

  const damage = file.damagePhotos[0];
  if (!damage) return file.uploadedByUserId === userId ? file : null;
  if (damage.reportedByUserId === userId) return file;
  const site = await location(damage.trishaw.storageLocationId);
  if (!site) return null;
  return allowsAdmin(access, readersOf(site)) ? file : null;
}

const ownerColumns = (owner: TypeOwner) => ({
  scope: owner.scope,
  scopeKey: ownerKey(owner),
  countryId: owner.scope === "country" ? owner.countryId : null,
  chapterId: owner.scope === "chapter" ? owner.chapterId : null,
});

export function listTypes(input: TypeSearchInput) {
  const { countryIds, chapterIds, search, includeArchived } =
    typeSearchInput.parse(input);
  return findTypes({
    OR: [
      { scope: "global" },
      { scope: "country", countryId: { in: countryIds } },
      { scope: "chapter", chapterId: { in: chapterIds } },
    ],
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(search ? { name: { contains: search } } : {}),
  });
}

export const getType = (id: string) => findTypeById(id);

async function requireType(id: string) {
  const type = await findTypeById(id);
  if (!type) throw new DomainError("unknownTrishawType");
  return type;
}

export async function typeAuthority(id: string): Promise<Authority> {
  const type = await requireType(id);
  if (type.scope === "global") return NO_ONE;
  if (type.scope === "country")
    return { chapters: [], countryIds: [type.countryId!] };
  return {
    chapters: [
      { chapterId: type.chapterId!, countryId: type.chapter!.countryId },
    ],
    countryIds: [],
  };
}

const typeWrite = <T>(write: () => Promise<T>) =>
  mapping(write, { unique: "typeNameTaken" });

export async function createType(input: TypeCreateInput, actorUserId: string) {
  const { owner, photoFileIds = [], ...data } = typeCreateInput.parse(input);
  for (const fileId of photoFileIds)
    await ownFile(fileId, actorUserId, "typePhoto");
  await ownFile(data.manualFileId, actorUserId, "typeManual");
  return typeWrite(() =>
    insertType({
      ...data,
      ...ownerColumns(owner),
      createdByUserId: actorUserId,
      ...galleryCreate(photoFileIds),
    }),
  );
}

export async function updateType(
  id: string,
  input: TypeUpdateInput,
  actorUserId: string,
) {
  const existing = await requireType(id);
  const data = typeUpdateInput.parse(input);
  if (data.manualFileId !== existing.manualFileId)
    await ownFile(data.manualFileId, actorUserId, "typeManual");
  return typeWrite(() => updateTypeById(id, data));
}

/** Only photos that are new to the gallery have to be the actor's own uploads. */
export async function setTypePhotos(
  id: string,
  fileIds: string[],
  actorUserId: string,
) {
  const existing = await requireType(id);
  const ids = photoIds.parse(fileIds);
  await assertNewPhotosOwned(existing.photos, ids, actorUserId, "typePhoto");
  return transaction((tx) => replaceTypePhotos(id, ids, tx));
}

export async function setTypeArchived(id: string, archived: boolean) {
  await requireType(id);
  return updateTypeById(id, { archivedAt: archived ? new Date() : null });
}

export async function deleteType(id: string) {
  const type = await requireType(id);
  if (type._count.trishaws > 0) throw new DomainError("typeInUse");
  return deleteTypeById(id);
}

/**
 * Promotion only ever widens: a chapter's model joins its own country's
 * catalogue, a country's joins the global one. Bikes keep pointing at the same
 * row, so nothing downstream notices.
 */
export function promotionTarget(type: TrishawTypeRow): TypeOwner | null {
  if (type.scope === "chapter")
    return { scope: "country", countryId: type.chapter!.countryId };
  if (type.scope === "country") return { scope: "global" };
  return null;
}

export async function promoteType(id: string) {
  const type = await requireType(id);
  const target = promotionTarget(type);
  if (!target) throw new DomainError("invalidPromotion");
  return typeWrite(() => updateTypeById(id, ownerColumns(target)));
}

function locationAuthorityOf(location: LocationRow): Authority {
  if (location.kind === "pool")
    return { chapters: [], countryIds: [location.countryId!] };
  return {
    chapters: [
      {
        chapterId: location.ownerChapterId!,
        countryId: location.ownerChapter!.countryId,
      },
    ],
    countryIds: [],
  };
}

const approvedMembers = (location: LocationRow) =>
  location.chapters
    .filter((link) => link.status === "approved")
    .map((link) => ({
      chapterId: link.chapterId,
      countryId: link.chapter.countryId,
    }));

function readersOf(location: LocationRow): Authority {
  const own = locationAuthorityOf(location);
  return { ...own, chapters: [...own.chapters, ...approvedMembers(location)] };
}

function trishawManagersOf(location: LocationRow): Authority {
  const own = locationAuthorityOf(location);
  if (location.kind !== "pool" || !location.membersMayManage) return own;
  return { ...own, chapters: approvedMembers(location) };
}

async function requireLocation(id: string) {
  const location = await findLocationById(id);
  if (!location) throw new DomainError("unknownLocation");
  return location;
}

export const getLocation = (id: string) => findLocationById(id);

export const getLocations = (ids: string[]) =>
  whenAny(ids, (ids) => findLocations({ id: { in: ids } }));

export const locationAuthority = async (id: string) =>
  locationAuthorityOf(await requireLocation(id));

export const locationReaders = async (id: string) =>
  readersOf(await requireLocation(id));

export const trishawManagersOfLocation = trishawManagersOf;

export const locationTrishawManagers = async (id: string) =>
  trishawManagersOf(await requireLocation(id));

export const listLocationsForChapters = (chapterIds: string[]) =>
  whenAny(chapterIds, (ids) =>
    findLocations({ ...reachableLocationWhere(ids), archivedAt: null }),
  );

export const listPools = (countryIds: string[]) =>
  whenAny(countryIds, (ids) =>
    findLocations({ kind: "pool", countryId: { in: ids } }),
  );

export const listMembershipsOfChapters = (chapterIds: string[]) =>
  whenAny(chapterIds, findMembershipsOfChapters);

export function createDefaultLocation(chapter: {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  return insertLocation({
    kind: "chapter",
    ownerChapterId: chapter.id,
    isDefault: true,
    name: chapter.name,
    address: chapter.address,
    latitude: chapter.latitude,
    longitude: chapter.longitude,
  });
}

export async function createChapterLocation(
  input: ChapterLocationInput,
  actorUserId: string,
) {
  const { chapterId, ...data } = chapterLocationInput.parse(input);
  await ownFile(data.entrancePhotoFileId, actorUserId, "entrancePhoto");
  return insertLocation({
    ...data,
    kind: "chapter",
    ownerChapterId: chapterId,
  });
}

export const getDefaultLocation = (chapterId: string) =>
  findDefaultLocation(chapterId);

function freshPoolCode(countryCode: string) {
  const pick = (length: number) =>
    Array.from(
      { length },
      () => POOL_CODE_ALPHABET[randomInt(POOL_CODE_ALPHABET.length)],
    ).join("");
  return `${countryCode.toUpperCase()}-${pick(4)}-${pick(2)}`;
}

async function assignPoolCode(id: string, countryCode: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await updateLocationById(id, {
        poolCode: freshPoolCode(countryCode),
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new DomainError("codeTaken");
}

export async function createPool(input: PoolInput, actorUserId: string) {
  const data = poolInput.parse(input);
  await ownFile(data.entrancePhotoFileId, actorUserId, "entrancePhoto");
  const pool = await insertLocation({ ...data, kind: "pool" });
  return assignPoolCode(pool.id, pool.country!.code);
}

export async function regeneratePoolCode(id: string) {
  const pool = await requireLocation(id);
  if (pool.kind !== "pool") throw new DomainError("unknownPool");
  return assignPoolCode(id, pool.country!.code);
}

export async function updateLocation(
  id: string,
  input: LocationUpdateInput,
  actorUserId: string,
) {
  const existing = await requireLocation(id);
  const { membersMayManage, ...data } = locationUpdateInput.parse(input);
  if (
    data.entrancePhotoFileId !== undefined &&
    data.entrancePhotoFileId !== existing.entrancePhotoFileId
  )
    await ownFile(data.entrancePhotoFileId, actorUserId, "entrancePhoto");
  return updateLocationById(id, {
    ...data,
    ...(existing.kind === "pool" && membersMayManage !== undefined
      ? { membersMayManage }
      : {}),
  });
}

export async function archiveLocation(id: string) {
  const location = await requireLocation(id);
  if (location.isDefault) throw new DomainError("defaultLocation");
  if (location._count.trishaws > 0) throw new DomainError("locationNotEmpty");
  if (location.kind === "pool") return deleteLocationById(id);
  return updateLocationById(id, { archivedAt: new Date() });
}

/**
 * An unknown code and a pool in another country answer the same, so the code
 * field cannot be used to learn which pools exist.
 */
export async function requestPoolAccess(input: {
  code: string;
  chapterId: string;
  chapterCountryId: string;
  requestedByUserId: string;
}) {
  const parsed = poolCode.safeParse(input.code);
  if (!parsed.success) throw new DomainError("unknownPool");
  const pool = await findPoolByCode(parsed.data);
  if (
    !pool ||
    pool.kind !== "pool" ||
    pool.archivedAt ||
    pool.countryId !== input.chapterCountryId
  )
    throw new DomainError("unknownPool");

  const existing = await findMembership(pool.id, input.chapterId);
  if (existing?.status === "approved") throw new DomainError("alreadyMember");
  if (existing?.status === "pending") return existing;

  return transaction(async (tx, emit) => {
    const membership = await upsertMembershipRequest(
      pool.id,
      input.chapterId,
      input.requestedByUserId,
      tx,
    );
    await emit({
      type: "pool.accessRequested",
      membershipId: membership.id,
      poolId: pool.id,
      countryId: pool.countryId!,
      chapterId: input.chapterId,
      actorUserId: input.requestedByUserId,
    });
    return membership;
  });
}

export async function membershipAuthority(id: string): Promise<Authority> {
  const membership = await findMembershipById(id);
  if (!membership) throw new DomainError("unknownApplication");
  return { chapters: [], countryIds: [membership.storageLocation.countryId!] };
}

export async function decidePoolRequest(
  input: PoolDecisionInput,
  decidedByUserId: string,
) {
  const { membershipId, approve, note } = poolDecisionInput.parse(input);
  return transaction(async (tx, emit) => {
    const membership = await findMembershipById(membershipId, tx);
    if (!membership) throw new DomainError("unknownApplication");
    if (membership.status !== "pending")
      throw new DomainError("alreadyDecided");

    const { count } = await setMembershipDecision(
      membershipId,
      approve ? "approved" : "rejected",
      decidedByUserId,
      note ?? null,
      tx,
    );
    if (count === 0) throw new DomainError("alreadyDecided");

    await emit({
      type: "pool.accessDecided",
      membershipId,
      poolId: membership.storageLocationId,
      chapterId: membership.chapterId,
      actorUserId: decidedByUserId,
      approved: approve,
      note: note ?? null,
    });
    return { ...membership, status: approve ? "approved" : "rejected" };
  });
}

export const trishawIdsAt = (locationId: string) =>
  findTrishawIdsAt(locationId);

export async function leavePool(input: {
  poolId: string;
  chapterId: string;
  futureRideCount: number;
}) {
  const membership = await findMembership(input.poolId, input.chapterId);
  if (!membership) throw new DomainError("unknownApplication");
  if (input.futureRideCount > 0) throw new DomainError("poolInUse");
  await deleteMembership(input.poolId, input.chapterId);
  return membership;
}

export const listTrishaws = (chapterIds: string[]) =>
  whenAny(chapterIds, findTrishawsOfChapters);

export const getTrishaw = (id: string) => findTrishawById(id);

export const getTrishaws = (ids: string[]) => whenAny(ids, findTrishawsByIds);

async function requireTrishaw(id: string) {
  const trishaw = await findTrishawById(id);
  if (!trishaw) throw new DomainError("unknownTrishaw");
  return trishaw;
}

export const trishawAuthority = async (id: string) =>
  locationTrishawManagers((await requireTrishaw(id)).storageLocation.id);

export const trishawReaders = async (id: string) =>
  locationReaders((await requireTrishaw(id)).storageLocation.id);

export const chapterIdsReaching = (trishaw: TrishawRow) =>
  reachingChapterIds(trishaw.storageLocation);

export const isGrounded = (trishaw: TrishawRow) =>
  trishaw.damages.some((damage) => damage.grounding);

const countryOfLocation = (location: {
  kind: string;
  countryId: string | null;
  ownerChapter: { countryId: string } | null;
}) =>
  location.kind === "pool"
    ? location.countryId
    : location.ownerChapter!.countryId;

/** A trishaw may only wear a model its location can see in the catalogue. */
async function assertTypeUsable(typeId: string | null, location: LocationRow) {
  if (!typeId) return;
  const type = await findTypeById(typeId);
  if (!type || type.archivedAt) throw new DomainError("unknownTrishawType");
  const visible =
    type.scope === "global" ||
    (type.scope === "country" &&
      type.countryId === countryOfLocation(location)) ||
    (type.scope === "chapter" &&
      reachingChapterIds(location).includes(type.chapterId!));
  if (!visible) throw new DomainError("unknownTrishawType");
}

const trishawWrite = <T>(write: () => Promise<T>) =>
  mapping(write, { unique: "frameNumberTaken" });

export async function addTrishaw(
  input: TrishawCreateInput,
  actorUserId: string | null,
) {
  const { photoFileIds = [], ...data } = trishawCreateInput.parse(input);
  const location = await requireLocation(data.storageLocationId);
  await assertTypeUsable(data.typeId, location);
  if (actorUserId)
    for (const fileId of photoFileIds)
      await ownFile(fileId, actorUserId, "trishawPhoto");
  return trishawWrite(() =>
    transaction(async (tx) => {
      const trishaw = await insertTrishaw(
        { ...data, ...galleryCreate(photoFileIds) },
        tx,
      );
      await insertLogEntry(trishaw.id, actorUserId, "created", {}, tx);
      return trishaw;
    }),
  );
}

/** The frame number is stamped on the bike: it may be filled in once, never changed. */
export async function updateTrishaw(id: string, input: TrishawUpdateInput) {
  const existing = await requireTrishaw(id);
  const data = trishawUpdateInput.parse(input);
  if (
    data.frameNumber !== undefined &&
    existing.frameNumber !== null &&
    data.frameNumber !== existing.frameNumber
  )
    throw new DomainError("frameNumberLocked");
  if (data.typeId !== undefined && data.typeId !== existing.typeId)
    await assertTypeUsable(
      data.typeId,
      await requireLocation(existing.storageLocation.id),
    );
  return trishawWrite(() => updateTrishawById(id, data));
}

export async function setTrishawPhotos(
  id: string,
  fileIds: string[],
  actorUserId: string,
) {
  const existing = await requireTrishaw(id);
  const ids = photoIds.parse(fileIds);
  await assertNewPhotosOwned(existing.photos, ids, actorUserId, "trishawPhoto");
  return transaction((tx) => replaceTrishawPhotos(id, ids, tx));
}

export async function moveTrishaw(
  id: string,
  storageLocationId: string,
  actorUserId: string,
) {
  const existing = await requireTrishaw(id);
  const target = await requireLocation(storageLocationId);
  if (target.archivedAt) throw new DomainError("unknownLocation");
  if (existing.storageLocation.id === target.id) return existing;
  return transaction(async (tx) => {
    const trishaw = await updateTrishawById(id, { storageLocationId }, tx);
    await insertLogEntry(
      id,
      actorUserId,
      "moved",
      {
        fromId: existing.storageLocation.id,
        from: existing.storageLocation.name,
        toId: target.id,
        to: target.name,
      },
      tx,
    );
    return trishaw;
  });
}

export async function setTrishawStatus(
  id: string,
  status: TrishawStatusName,
  actorUserId: string | null,
) {
  const existing = await requireTrishaw(id);
  const next = trishawStatusInput.parse(status);
  if (existing.status === next) return existing;
  if (next === "active" && isGrounded(existing))
    throw new DomainError("trishawGrounded");
  return transaction(async (tx) => {
    const trishaw = await updateTrishawById(id, { status: next }, tx);
    await insertLogEntry(
      id,
      actorUserId,
      "statusChanged",
      { from: existing.status, to: next },
      tx,
    );
    return trishaw;
  });
}

export async function deleteTrishaw(id: string) {
  await requireTrishaw(id);
  return deleteTrishawById(id);
}

/**
 * Reachability and roadworthiness are stable facts and are checked here.
 * Whether the window is free is not — that is checked under a row lock inside
 * the ride's own write.
 */
export async function assertUsable(trishawIds: string[], chapterId: string) {
  const rows = await getTrishaws(trishawIds);
  for (const id of trishawIds) {
    const trishaw = rows.find((row) => row.id === id);
    if (!trishaw) throw new DomainError("unknownTrishaw");
    if (!chapterIdsReaching(trishaw).includes(chapterId))
      throw new DomainError("trishawNotInChapter");
    if (trishaw.status !== "active")
      throw new DomainError("trishawUnavailable");
  }
  return rows;
}

export async function reportDamage(
  input: DamageReportInput & {
    reportedByUserId: string;
    chapterId: string | null;
    affectedRideIds: string[];
  },
) {
  const data = damageReportInput.parse(input);
  const trishaw = await requireTrishaw(data.trishawId);
  await ownFile(data.photoFileId, input.reportedByUserId, "damagePhoto");

  return transaction(async (tx, emit) => {
    const damage = await insertDamage(
      {
        trishawId: trishaw.id,
        rideId: data.rideId ?? null,
        description: data.description,
        photoFileId: data.photoFileId ?? null,
        grounding: data.grounding,
        reportedByUserId: input.reportedByUserId,
      },
      tx,
    );
    await insertLogEntry(
      trishaw.id,
      input.reportedByUserId,
      "damageReported",
      { damageId: damage.id, grounding: data.grounding },
      tx,
    );
    if (data.grounding && trishaw.status === "active") {
      await updateTrishawById(trishaw.id, { status: "maintenance" }, tx);
      await insertLogEntry(
        trishaw.id,
        input.reportedByUserId,
        "statusChanged",
        { from: "active", to: "maintenance", damageId: damage.id },
        tx,
      );
    }
    await emit({
      type: "trishaw.damageReported",
      damageId: damage.id,
      trishawId: trishaw.id,
      poolCountryId:
        trishaw.storageLocation.kind === "pool"
          ? trishaw.storageLocation.countryId
          : null,
      reachingChapterIds: chapterIdsReaching(trishaw),
      chapterId: input.chapterId,
      actorUserId: input.reportedByUserId,
      grounding: data.grounding,
      affectedRideIds: data.grounding ? input.affectedRideIds : [],
    });
    return damage;
  });
}

export async function damageAuthority(id: string) {
  const damage = await findDamageById(id);
  if (!damage) throw new DomainError("unknownDamage");
  return trishawAuthority(damage.trishawId);
}

/**
 * Clears one or more damages of the same trishaw with one note. Clearing the
 * last open grounding damage returns the trishaw to service, but only from
 * `maintenance` — a trishaw an admin retired stays retired.
 */
export async function clearDamages(
  input: DamageClearInput,
  actorUserId: string,
) {
  const { damageIds, note } = damageClearInput.parse(input);
  return transaction(async (tx) => {
    const damages = await Promise.all(
      damageIds.map((damageId) => findDamageById(damageId, tx)),
    );
    if (damages.some((damage) => !damage))
      throw new DomainError("unknownDamage");
    const trishawId = damages[0]!.trishawId;
    if (damages.some((damage) => damage!.trishawId !== trishawId))
      throw new DomainError("unknownDamage");

    for (const damageId of damageIds) {
      const { count } = await clearDamageById(damageId, actorUserId, note, tx);
      if (count === 0) throw new DomainError("alreadyCleared");
      await insertLogEntry(
        trishawId,
        actorUserId,
        "damageCleared",
        { damageId, note },
        tx,
      );
    }

    const trishaw = await findTrishawById(trishawId, tx);
    if (
      damages.some((damage) => damage!.grounding) &&
      trishaw?.status === "maintenance" &&
      (await countOpenGroundingDamages(trishawId, tx)) === 0
    ) {
      await updateTrishawById(trishawId, { status: "active" }, tx);
      await insertLogEntry(
        trishawId,
        actorUserId,
        "statusChanged",
        { from: "maintenance", to: "active", damageId: damageIds[0] },
        tx,
      );
    }
    return damages;
  });
}

export const listDamages = (trishawId: string) =>
  findDamagesOfTrishaw(trishawId);

export const listDamagesReportedOnRide = (rideId: string, userId: string) =>
  findDamagesOfRide(rideId, userId);

export const listLog = (trishawId: string) => findLogOfTrishaw(trishawId);

export async function addNote(input: TrishawNoteInput, actorUserId: string) {
  const { trishawId, text } = trishawNoteInput.parse(input);
  await requireTrishaw(trishawId);
  return insertLogEntry(trishawId, actorUserId, "note", { text });
}
