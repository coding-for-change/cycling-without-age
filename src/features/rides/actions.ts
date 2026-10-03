"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminScope, requireChapterAdmin } from "@/lib/auth-guards";
import { actionFailure, type DomainErrorCode } from "@/lib/domain-error";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { bookRider } from "@/use-cases/book-rider";
import {
  allocateTrishaws,
  freeTrishawsInWindow,
  scheduleRideAt,
} from "@/use-cases/schedule-ride";
import { staffRide } from "@/use-cases/staff-ride";
import { rides } from "./index";
import {
  trishawOptions,
  type TrishawOption,
} from "./components/trishaw-options";
import {
  cancelRideInput,
  rideDetailsPatch,
  rideLogNote,
  scheduleRideForm,
  trishawIdList,
  trishawWindowQuery,
  wallSlot,
} from "./schemas";

const MAPPED_ERRORS = [
  "legsOverlap",
  "notPilot",
  "partOfRoundTrip",
  "rideClosed",
  "rideNotCancelled",
  "riderNotInChapter",
  "trishawNotInChapter",
  "trishawReserved",
  "trishawUnavailable",
  "unknownChapter",
  "unknownPassenger",
  "unknownRide",
  "unknownTrishaw",
] as const satisfies readonly DomainErrorCode[];

export type RideError = (typeof MAPPED_ERRORS)[number] | "generic";

export type RideResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: RideError };

const INVALID = { ok: false, error: "generic" } as const;

const ERROR_MAP: Partial<Record<DomainErrorCode, RideError>> =
  Object.fromEntries(MAPPED_ERRORS.map((code) => [code, code]));

/**
 * A ride shows up on the admin week, on the pilot's and the riders' agendas and
 * in their calendar feeds, so a change refreshes all three trees.
 */
const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/pilot", "layout");
  revalidatePath("/passenger", "layout");
};

async function attempt<T extends object = object>(
  run: () => Promise<T | void>,
): Promise<RideResult<T>> {
  try {
    const extra = await run();
    refresh();
    return { ok: true, ...extra } as RideResult<T>;
  } catch (error) {
    return actionFailure<RideError>(error, ERROR_MAP);
  }
}

const id = z.string().min(1).max(64);

/**
 * Every action on an existing ride is authorised by the ride's own chapter,
 * read from the database — never by a chapter the client names. Someone with
 * no admin scope at all is turned away before the ride is even looked up.
 */
async function adminOfRide(rideId: string) {
  await requireAdminScope();
  const ride = await rides.getRide(rideId);
  if (!ride) return null;
  const session = await requireChapterAdmin(ride.chapterId);
  return { ride, session };
}

export async function scheduleRideAction(
  input: unknown,
): Promise<RideResult<{ id: string }>> {
  const parsed = scheduleRideForm.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireChapterAdmin(parsed.data.chapterId);
  return attempt(async () => {
    const ride = await scheduleRideAt(parsed.data, session.user.id);
    return { id: ride.id };
  });
}

/** What the scheduling drawer can offer for the window being typed in. */
export async function availableTrishawsAction(
  input: unknown,
): Promise<RideResult<{ options: TrishawOption[] }>> {
  const parsed = trishawWindowQuery.safeParse(input);
  if (!parsed.success) return INVALID;
  await requireChapterAdmin(parsed.data.chapterId);
  try {
    const [choices, dict, language] = await Promise.all([
      freeTrishawsInWindow(parsed.data),
      getDictionary(),
      getLocale(),
    ]);
    return {
      ok: true,
      options: trishawOptions(choices, new Set(), dict, wordsLocale(language)),
    };
  } catch (error) {
    return actionFailure<RideError>(error, ERROR_MAP);
  }
}

export async function rescheduleRideAction(
  rideId: string,
  slot: unknown,
): Promise<RideResult> {
  const parsedId = id.safeParse(rideId);
  const parsed = wallSlot.safeParse(slot);
  if (!parsedId.success || !parsed.success) return INVALID;
  const admin = await adminOfRide(parsedId.data);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await rides.rescheduleRideAt(
      parsedId.data,
      parsed.data,
      admin.session.user.id,
    );
  });
}

export async function updateRideAction(
  rideId: string,
  patch: unknown,
): Promise<RideResult> {
  const parsedId = id.safeParse(rideId);
  const parsed = rideDetailsPatch.safeParse(patch);
  if (!parsedId.success || !parsed.success) return INVALID;
  const admin = await adminOfRide(parsedId.data);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await rides.updateRideDetails(
      parsedId.data,
      parsed.data,
      admin.session.user.id,
    );
  });
}

export async function cancelRideAction(
  rideId: string,
  input: unknown,
): Promise<RideResult<{ cancelledIds: string[] }>> {
  const parsedId = id.safeParse(rideId);
  const parsed = cancelRideInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  const admin = await adminOfRide(parsedId.data);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(() =>
    rides.cancelRide(parsedId.data, parsed.data, admin.session.user.id),
  );
}

export async function deleteRideAction(rideId: string): Promise<RideResult> {
  const parsedId = id.safeParse(rideId);
  if (!parsedId.success) return INVALID;
  const admin = await adminOfRide(parsedId.data);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await rides.deleteRide(parsedId.data, admin.session.user.id);
  });
}

const allocationInput = z.object({
  rideId: id,
  trishawIds: trishawIdList,
});

export async function allocateTrishawsAction(
  input: unknown,
): Promise<RideResult> {
  const parsed = allocationInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await allocateTrishaws(
      parsed.data.rideId,
      parsed.data.trishawIds,
      admin.session.user.id,
    );
  });
}

const pilotInput = z.object({ rideId: id, userId: id });

export async function assignPilotAction(input: unknown): Promise<RideResult> {
  const parsed = pilotInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await staffRide(
      parsed.data.rideId,
      parsed.data.userId,
      admin.session.user.id,
    );
  });
}

export async function unassignPilotAction(input: unknown): Promise<RideResult> {
  const parsed = pilotInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await rides.unassignVolunteer(
      parsed.data.rideId,
      parsed.data.userId,
      admin.session.user.id,
    );
  });
}

const riderInput = z.object({ rideId: id, passengerId: id });

export async function bookRiderAction(input: unknown): Promise<RideResult> {
  const parsed = riderInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await bookRider(
      parsed.data.rideId,
      parsed.data.passengerId,
      admin.session.user.id,
    );
  });
}

export async function removeRiderAction(input: unknown): Promise<RideResult> {
  const parsed = riderInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await rides.cancelBooking(
      parsed.data.rideId,
      parsed.data.passengerId,
      admin.session.user.id,
    );
  });
}

const noteInput = z.object({ rideId: id, text: rideLogNote });

export async function addRideNoteAction(input: unknown): Promise<RideResult> {
  const parsed = noteInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(async () => {
    await rides.addRideNote(
      parsed.data.rideId,
      parsed.data.text,
      admin.session.user.id,
    );
  });
}
