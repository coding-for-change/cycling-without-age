"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScope, requireChapterAdmin } from "@/lib/auth-guards";
import {
  createAttempt,
  type ActionResult,
  type DomainErrorCode,
} from "@/lib/domain-error";
import { rideLocations } from "./index";
import { id, rideLocationInput, rideLocationUpdateInput } from "./schemas";

const MAPPED_ERRORS = [
  "locationArchived",
  "unknownLocation",
] as const satisfies readonly DomainErrorCode[];

export type RideLocationError = (typeof MAPPED_ERRORS)[number] | "generic";

export type RideLocationResult<T extends object = object> = ActionResult<
  RideLocationError,
  T
>;

const INVALID = { ok: false, error: "generic" } as const;

const { attempt } = createAttempt(MAPPED_ERRORS, () =>
  revalidatePath("/admin", "layout"),
);

async function requireLocationAdmin(locationId: string) {
  await requireAdminScope();
  const chapterId = await rideLocations.rideLocationChapterId(locationId);
  if (!chapterId) return null;
  return requireChapterAdmin(chapterId);
}

export async function createRideLocationAction(
  input: unknown,
): Promise<RideLocationResult<{ id: string }>> {
  const parsed = rideLocationInput.safeParse(input);
  if (!parsed.success) return INVALID;
  await requireChapterAdmin(parsed.data.chapterId);
  return attempt(async () => {
    const location = await rideLocations.createRideLocation(parsed.data);
    return { id: location.id };
  });
}

export async function updateRideLocationAction(
  locationId: string,
  input: unknown,
): Promise<RideLocationResult> {
  const parsedId = id.safeParse(locationId);
  const parsed = rideLocationUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  if (!(await requireLocationAdmin(parsedId.data)))
    return { ok: false, error: "unknownLocation" };
  return attempt(async () => {
    await rideLocations.updateRideLocation(parsedId.data, parsed.data);
  });
}

export async function archiveRideLocationAction(
  locationId: string,
): Promise<RideLocationResult> {
  const parsedId = id.safeParse(locationId);
  if (!parsedId.success) return INVALID;
  if (!(await requireLocationAdmin(parsedId.data)))
    return { ok: false, error: "unknownLocation" };
  return attempt(() => rideLocations.archiveRideLocation(parsedId.data));
}

export async function restoreRideLocationAction(
  locationId: string,
): Promise<RideLocationResult> {
  const parsedId = id.safeParse(locationId);
  if (!parsedId.success) return INVALID;
  if (!(await requireLocationAdmin(parsedId.data)))
    return { ok: false, error: "unknownLocation" };
  return attempt(() => rideLocations.restoreRideLocation(parsedId.data));
}
