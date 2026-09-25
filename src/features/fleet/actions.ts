"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { hasAnyAdminScope } from "@/lib/access";
import {
  requireAdminOf,
  requireAuth,
  requireChapterAdmin,
  requireChapterRole,
  requireCountryAdmin,
  requireSuperAdmin,
} from "@/lib/auth-guards";
import { actionFailure, type DomainErrorCode } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { leavePool } from "@/use-cases/leave-pool";
import {
  reportDamageAsAdmin,
  reportDamageAsPilot,
} from "@/use-cases/report-damage";
import { fleet } from "./index";
import {
  chapterLocationInput,
  damageClearInput,
  damageReportInput,
  id,
  locationUpdateInput,
  photoIds,
  poolDecisionInput,
  poolInput,
  trishawCreateInput,
  trishawNoteInput,
  trishawStatusInput,
  trishawUpdateInput,
  typeCreateInput,
  typeUpdateInput,
  uploadCommitInput,
  uploadRequestInput,
  type TypeOwner,
} from "./schemas";

const MAPPED_ERRORS = [
  "alreadyCleared",
  "alreadyDecided",
  "alreadyMember",
  "defaultLocation",
  "frameNumberLocked",
  "frameNumberTaken",
  "invalidFile",
  "locationNotEmpty",
  "poolInUse",
  "trishawGrounded",
  "trishawNotInChapter",
  "trishawReserved",
  "trishawUnavailable",
  "typeInUse",
  "typeNameTaken",
  "unknownPool",
  "uploadRejected",
] as const satisfies readonly DomainErrorCode[];

export type FleetError =
  (typeof MAPPED_ERRORS)[number] | "rateLimited" | "generic";

export type FleetResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: FleetError };

const INVALID = { ok: false, error: "generic" } as const;

const ERROR_MAP: Partial<Record<DomainErrorCode, FleetError>> =
  Object.fromEntries(MAPPED_ERRORS.map((code) => [code, code]));

const failed = (error: unknown): { ok: false; error: FleetError } =>
  actionFailure<FleetError>(error, ERROR_MAP);

const refresh = () => revalidatePath("/admin", "layout");

async function attempt<T extends object = object>(
  run: () => Promise<T | void>,
  { revalidate = true }: { revalidate?: boolean } = {},
): Promise<FleetResult<T>> {
  try {
    const extra = await run();
    if (revalidate) refresh();
    return { ok: true, ...extra } as FleetResult<T>;
  } catch (error) {
    return failed(error);
  }
}

export async function requestUploadAction(
  input: unknown,
): Promise<FleetResult<{ key: string; url: string }>> {
  const parsed = uploadRequestInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireAuth();
  const isAdmin = hasAnyAdminScope(session.access);
  const isPilot = session.access.memberships.some((m) =>
    m.roles.includes("pilot"),
  );
  if (parsed.data.kind === "damagePhoto" ? !isAdmin && !isPilot : !isAdmin)
    return INVALID;
  if (
    !withinRateLimit(`upload:${session.user.id}`, {
      max: 30,
      windowMs: 10 * 60_000,
    })
  )
    return { ok: false, error: "rateLimited" };

  return attempt(() => fleet.requestUpload(session.user.id, parsed.data), {
    revalidate: false,
  });
}

export async function commitUploadAction(
  input: unknown,
): Promise<FleetResult<{ fileId: string }>> {
  const parsed = uploadCommitInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireAuth();
  return attempt(
    async () => {
      const file = await fleet.commitUpload(session.user.id, parsed.data);
      return { fileId: file.id };
    },
    { revalidate: false },
  );
}

const requireTypeOwner = (owner: TypeOwner) =>
  owner.scope === "global"
    ? requireSuperAdmin()
    : owner.scope === "country"
      ? requireCountryAdmin(owner.countryId)
      : requireChapterAdmin(owner.chapterId);

const requireTypeManager = async (typeId: string) =>
  requireAdminOf(await fleet.typeAuthority(typeId));

export async function createTypeAction(
  input: unknown,
): Promise<FleetResult<{ id: string }>> {
  const parsed = typeCreateInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireTypeOwner(parsed.data.owner);
  return attempt(async () => {
    const type = await fleet.createType(parsed.data, session.user.id);
    return { id: type.id };
  });
}

export async function updateTypeAction(
  typeId: string,
  input: unknown,
): Promise<FleetResult> {
  const parsedId = id.safeParse(typeId);
  const parsed = typeUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireTypeManager(parsedId.data);
    await fleet.updateType(parsedId.data, parsed.data, session.user.id);
  });
}

export async function setTypePhotosAction(
  typeId: string,
  fileIds: unknown,
): Promise<FleetResult> {
  const parsedId = id.safeParse(typeId);
  const parsed = photoIds.safeParse(fileIds);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireTypeManager(parsedId.data);
    await fleet.setTypePhotos(parsedId.data, parsed.data, session.user.id);
  });
}

export async function setTypeArchivedAction(
  typeId: string,
  archived: boolean,
): Promise<FleetResult> {
  const parsedId = id.safeParse(typeId);
  if (!parsedId.success || typeof archived !== "boolean") return INVALID;
  return attempt(async () => {
    await requireTypeManager(parsedId.data);
    await fleet.setTypeArchived(parsedId.data, archived);
  });
}

export async function deleteTypeAction(typeId: string): Promise<FleetResult> {
  const parsedId = id.safeParse(typeId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireTypeManager(parsedId.data);
    await fleet.deleteType(parsedId.data);
  });
}

export async function promoteTypeAction(typeId: string): Promise<FleetResult> {
  const parsedId = id.safeParse(typeId);
  if (!parsedId.success) return INVALID;
  const type = await fleet.getType(parsedId.data);
  const target = type ? fleet.promotionTarget(type) : null;
  if (!target) return INVALID;
  await requireTypeOwner(target);
  return attempt(async () => {
    await fleet.promoteType(parsedId.data);
  });
}

export async function createTrishawAction(
  input: unknown,
): Promise<FleetResult<{ id: string }>> {
  const parsed = trishawCreateInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireAdminOf(
      await fleet.locationTrishawManagers(parsed.data.storageLocationId),
    );
    const trishaw = await fleet.addTrishaw(parsed.data, session.user.id);
    return { id: trishaw.id };
  });
}

const requireTrishawManager = async (trishawId: string) =>
  requireAdminOf(await fleet.trishawAuthority(trishawId));

export async function updateTrishawAction(
  trishawId: string,
  input: unknown,
): Promise<FleetResult> {
  const parsedId = id.safeParse(trishawId);
  const parsed = trishawUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    await requireTrishawManager(parsedId.data);
    await fleet.updateTrishaw(parsedId.data, parsed.data);
  });
}

export async function setTrishawPhotosAction(
  trishawId: string,
  fileIds: unknown,
): Promise<FleetResult> {
  const parsedId = id.safeParse(trishawId);
  const parsed = photoIds.safeParse(fileIds);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireTrishawManager(parsedId.data);
    await fleet.setTrishawPhotos(parsedId.data, parsed.data, session.user.id);
  });
}

export async function moveTrishawAction(
  trishawId: string,
  storageLocationId: string,
): Promise<FleetResult> {
  const parsedId = id.safeParse(trishawId);
  const parsedLocation = id.safeParse(storageLocationId);
  if (!parsedId.success || !parsedLocation.success) return INVALID;
  return attempt(async () => {
    const session = await requireTrishawManager(parsedId.data);
    await requireAdminOf(
      await fleet.locationTrishawManagers(parsedLocation.data),
    );
    await fleet.moveTrishaw(
      parsedId.data,
      parsedLocation.data,
      session.user.id,
    );
  });
}

export async function setTrishawStatusAction(
  trishawId: string,
  status: unknown,
): Promise<FleetResult> {
  const parsedId = id.safeParse(trishawId);
  const parsedStatus = trishawStatusInput.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return INVALID;
  return attempt(async () => {
    const session = await requireTrishawManager(parsedId.data);
    await fleet.setTrishawStatus(
      parsedId.data,
      parsedStatus.data,
      session.user.id,
    );
  });
}

export async function deleteTrishawAction(
  trishawId: string,
): Promise<FleetResult> {
  const parsedId = id.safeParse(trishawId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireTrishawManager(parsedId.data);
    await fleet.deleteTrishaw(parsedId.data);
  });
}

export async function addTrishawNoteAction(
  input: unknown,
): Promise<FleetResult> {
  const parsed = trishawNoteInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireAdminOf(
      await fleet.trishawReaders(parsed.data.trishawId),
    );
    await fleet.addNote(parsed.data, session.user.id);
  });
}

export async function reportDamageAction(input: unknown): Promise<FleetResult> {
  const parsed = damageReportInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireAdminOf(
      await fleet.trishawReaders(parsed.data.trishawId),
    );
    await reportDamageAsAdmin({ input: parsed.data, userId: session.user.id });
  });
}

const rideDamageInput = damageReportInput.extend({ rideId: id });

export async function reportRideDamageAction(
  input: unknown,
): Promise<FleetResult> {
  const parsed = rideDamageInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const ride = await rides.getRide(parsed.data.rideId);
  if (!ride) return INVALID;
  const session = await requireChapterRole(ride.chapterId, "pilot");
  return attempt(async () => {
    await reportDamageAsPilot({
      input: parsed.data,
      userId: session.user.id,
      ride,
    });
    revalidatePath("/pilot", "layout");
  });
}

export async function clearDamageAction(input: unknown): Promise<FleetResult> {
  const parsed = damageClearInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireAdminOf(
      await fleet.damageAuthority(parsed.data.damageIds[0]),
    );
    await fleet.clearDamages(parsed.data, session.user.id);
  });
}

export async function createLocationAction(
  input: unknown,
): Promise<FleetResult<{ id: string }>> {
  const parsed = chapterLocationInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireChapterAdmin(parsed.data.chapterId);
  return attempt(async () => {
    const location = await fleet.createChapterLocation(
      parsed.data,
      session.user.id,
    );
    return { id: location.id };
  });
}

export async function createPoolAction(
  input: unknown,
): Promise<FleetResult<{ id: string }>> {
  const parsed = poolInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireCountryAdmin(parsed.data.countryId);
  return attempt(async () => {
    const pool = await fleet.createPool(parsed.data, session.user.id);
    return { id: pool.id };
  });
}

export async function updateLocationAction(
  locationId: string,
  input: unknown,
): Promise<FleetResult> {
  const parsedId = id.safeParse(locationId);
  const parsed = locationUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireAdminOf(
      await fleet.locationAuthority(parsedId.data),
    );
    await fleet.updateLocation(parsedId.data, parsed.data, session.user.id);
  });
}

export async function regeneratePoolCodeAction(
  locationId: string,
): Promise<FleetResult<{ code: string }>> {
  const parsedId = id.safeParse(locationId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireAdminOf(await fleet.locationAuthority(parsedId.data));
    const pool = await fleet.regeneratePoolCode(parsedId.data);
    return { code: pool.poolCode ?? "" };
  });
}

export async function archiveLocationAction(
  locationId: string,
): Promise<FleetResult> {
  const parsedId = id.safeParse(locationId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireAdminOf(await fleet.locationAuthority(parsedId.data));
    await fleet.archiveLocation(parsedId.data);
  });
}

const poolRequestInput = z.object({ code: z.string().max(32), chapterId: id });

export async function requestPoolAccessAction(
  input: unknown,
): Promise<FleetResult<{ status: string }>> {
  const parsed = poolRequestInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireChapterAdmin(parsed.data.chapterId);
  if (
    !withinRateLimit(`pool-code:${session.user.id}`, {
      max: 10,
      windowMs: 15 * 60_000,
    })
  )
    return { ok: false, error: "rateLimited" };

  const countryId = await chapters.getChapterCountryId(parsed.data.chapterId);
  if (!countryId) return INVALID;
  return attempt(async () => {
    const membership = await fleet.requestPoolAccess({
      code: parsed.data.code,
      chapterId: parsed.data.chapterId,
      chapterCountryId: countryId,
      requestedByUserId: session.user.id,
    });
    return { status: membership.status };
  });
}

export async function decidePoolRequestAction(
  input: unknown,
): Promise<FleetResult> {
  const parsed = poolDecisionInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireAdminOf(
      await fleet.membershipAuthority(parsed.data.membershipId),
    );
    await fleet.decidePoolRequest(parsed.data, session.user.id);
  });
}

const leaveInput = z.object({ poolId: id, chapterId: id });

export async function leavePoolAction(input: unknown): Promise<FleetResult> {
  const parsed = leaveInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const [pool, countryId] = await Promise.all([
    fleet.getLocation(parsed.data.poolId),
    chapters.getChapterCountryId(parsed.data.chapterId),
  ]);
  if (!pool || pool.kind !== "pool" || !countryId) return INVALID;
  await requireAdminOf({
    chapters: [{ chapterId: parsed.data.chapterId, countryId }],
    countryIds: [pool.countryId!],
  });
  return attempt(async () => {
    await leavePool(parsed.data.poolId, parsed.data.chapterId);
  });
}
