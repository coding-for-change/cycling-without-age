"use server";

import { revalidatePath } from "next/cache";
import { rideRef, rides } from "@/features/rides";
import { hasChapterRole } from "@/lib/access";
import { requireAuth } from "@/lib/auth-guards";
import { createAttempt, type ActionResult } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { signUpForRide, withdrawFromRide } from "@/use-cases/sign-up-for-ride";

const MAPPED_ERRORS = [
  "notAssigned",
  "notPilot",
  "pilotNotReady",
  "rideClosed",
  "rideFullyStaffed",
  "selfSignUpOff",
  "tooLateToWithdraw",
  "unknownRide",
] as const;

export type PilotRideError =
  (typeof MAPPED_ERRORS)[number] | "rateLimited" | "generic";

export type PilotRideResult = ActionResult<
  PilotRideError,
  { changed: boolean }
>;

const SIGN_UP_LIMIT = { max: 20, windowMs: 60 * 60_000 };

const revalidateRides = () => {
  revalidatePath("/pilot", "layout");
  revalidatePath("/passenger", "layout");
  revalidatePath("/admin", "layout");
};

const { attempt } = createAttempt(MAPPED_ERRORS, revalidateRides);

/**
 * A refusal because the ride moved on under the screen — it filled up or
 * closed — reloads the screen too, so it stops offering what is gone.
 */
const STALE: readonly PilotRideError[] = [
  "notAssigned",
  "rideClosed",
  "rideFullyStaffed",
  "tooLateToWithdraw",
];

const refreshedIfStale = (result: PilotRideResult) => {
  if (!result.ok && STALE.includes(result.error)) revalidateRides();
  return result;
};

/**
 * The pilot's own seat on a ride of a chapter they pilot for. The chapter is
 * read from the ride, never taken from the client, and the use case asks the
 * membership row again: a superadmin or a country admin is not a pilot.
 */
async function pilotOfRide(input: unknown) {
  const parsed = rideRef.safeParse({ rideId: input });
  if (!parsed.success) return null;
  const session = await requireAuth();
  const ride = await rides.getRideScope(parsed.data.rideId);
  if (!ride || !hasChapterRole(session.access, ride.chapterId, "pilot"))
    return null;
  return { rideId: ride.id, userId: session.user.id };
}

export async function signUpForRideAction(
  rideId: unknown,
): Promise<PilotRideResult> {
  const pilot = await pilotOfRide(rideId);
  if (!pilot) return { ok: false, error: "unknownRide" };
  if (!withinRateLimit(`ride-sign-up:${pilot.userId}`, SIGN_UP_LIMIT))
    return { ok: false, error: "rateLimited" };
  return refreshedIfStale(
    await attempt(async () => ({
      changed: await signUpForRide(pilot.rideId, pilot.userId),
    })),
  );
}

export async function withdrawFromRideAction(
  rideId: unknown,
): Promise<PilotRideResult> {
  const pilot = await pilotOfRide(rideId);
  if (!pilot) return { ok: false, error: "unknownRide" };
  if (!withinRateLimit(`ride-sign-up:${pilot.userId}`, SIGN_UP_LIMIT))
    return { ok: false, error: "rateLimited" };
  return refreshedIfStale(
    await attempt(async () => ({
      changed: await withdrawFromRide(pilot.rideId, pilot.userId),
    })),
  );
}
