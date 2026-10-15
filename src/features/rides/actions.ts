"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isChapterAdmin } from "@/lib/access";
import {
  requireAdminScope,
  requireAuth,
  requireChapterAdmin,
} from "@/lib/auth-guards";
import { createAttempt, type ActionResult } from "@/lib/domain-error";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { cyclingRoute, type Route } from "@/lib/mapbox";
import { withinRateLimit } from "@/lib/rate-limit";
import {
  commitUpload,
  requestUpload,
  uploadCommit,
  uploadRequest,
  withinUploadLimit,
} from "@/lib/storage";
import { bookRider } from "@/use-cases/book-rider";
import { completeRide } from "@/use-cases/complete-ride";
import {
  allocateTrishaws,
  freeTrishawsInWindow,
  scheduleRideAt,
} from "@/use-cases/schedule-ride";
import { staffRide } from "@/use-cases/staff-ride";
import { rides, type Executor, type RideScope } from "./index";
import { toListPage, type ListRidePage } from "./components/ride-list-rows";
import {
  trishawOptions,
  type TrishawOption,
} from "./components/trishaw-options";
import {
  announceInput,
  bookRiderInput,
  cancelRideInput,
  checkInInput,
  debriefInput,
  pilotNoShowInput,
  rosterEntryRef,
  walkUpInput,
  noteInput,
  pilotInput,
  reorderRosterInput,
  rescheduleInput,
  rideDetailsPatch,
  rideListPageInput,
  ridePhotosInput,
  rideRef,
  rideTrishawsInput,
  riderInput,
  routeEstimateInput,
  scheduleRideForm,
  trishawWindowQuery,
} from "./schemas";

const MAPPED_ERRORS = [
  "capacityBelowRoster",
  "capacityRequired",
  "checkInClosed",
  "destinationRequired",
  "eventsOnly",
  "invalidFile",
  "legsOverlap",
  "notAssigned",
  "notPilot",
  "otherLegScheduled",
  "partOfRoundTrip",
  "photosEventOnly",
  "pilotsFull",
  "pleasureLimit",
  "rideClosed",
  "rideFull",
  "rideNotCancelled",
  "rideNotCompleted",
  "rideNotStarted",
  "riderNotInChapter",
  "rosterChanged",
  "titleRequired",
  "tooManyPilots",
  "trishawNotInChapter",
  "trishawReserved",
  "trishawUnavailable",
  "unknownChapter",
  "unknownPassenger",
  "unknownRide",
  "unknownTrishaw",
  "uploadRejected",
] as const;

const FORM_ERRORS = [
  "titleRequired",
  "capacityRequired",
  "destinationRequired",
  "tooManyPilots",
  "photosEventOnly",
  "pleasureLimit",
  "capacityBelowRoster",
] as const;

type FormError = (typeof FORM_ERRORS)[number];

export type RideError =
  (typeof MAPPED_ERRORS)[number] | FormError | "rateLimited" | "generic";

export type RideResult<T extends object = object> = ActionResult<RideError, T>;

const INVALID = { ok: false, error: "generic" } as const;

const isFormError = (message: string): message is FormError =>
  (FORM_ERRORS as readonly string[]).includes(message);

function rejected(error: z.ZodError) {
  const known = error.issues.find((issue) => isFormError(issue.message));
  return known
    ? ({ ok: false, error: known.message as FormError } as const)
    : INVALID;
}

/**
 * A ride shows up on the admin week, on the pilot's and the riders' agendas and
 * in their calendar feeds, so a change refreshes all three trees.
 */
const { attempt, failed } = createAttempt(MAPPED_ERRORS, () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/pilot", "layout");
  revalidatePath("/passenger", "layout");
});

/**
 * Every action on an existing ride is authorised by the ride's own chapter,
 * read from the database — never by a chapter the client names. Someone with
 * no admin scope at all is turned away before the ride is even looked up.
 */
async function adminOfRide(rideId: string) {
  await requireAdminScope();
  const ride = await rides.getRideScope(rideId);
  if (!ride) return null;
  const { user } = await requireChapterAdmin(ride.chapterId);
  return { ride, actorUserId: user.id };
}

async function onRide<
  S extends z.ZodType<{ rideId: string }>,
  R,
  T extends object = object,
>(
  schema: S,
  input: unknown,
  run: (data: z.output<S>, ride: RideScope, actorUserId: string) => Promise<R>,
  reply?: (result: R) => T,
): Promise<RideResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return rejected(parsed.error);
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt<T>(async () => {
    const result = await run(parsed.data, admin.ride, admin.actorUserId);
    return reply?.(result);
  });
}

const changed = (changed: boolean) => ({ changed });

export async function scheduleRideAction(
  input: unknown,
): Promise<RideResult<{ id: string }>> {
  const parsed = scheduleRideForm.safeParse(input);
  if (!parsed.success) return rejected(parsed.error);
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
    return failed(error);
  }
}

const rescheduleOf = rideRef.extend({ times: rescheduleInput });

export async function rescheduleRideAction(
  rideId: string,
  input: unknown,
): Promise<RideResult> {
  return onRide(rescheduleOf, { rideId, times: input }, (data, ride, actor) =>
    rides.rescheduleRide(ride.id, data.times, actor),
  );
}

const patchOf = rideRef.extend({ patch: rideDetailsPatch });

export async function updateRideAction(
  rideId: string,
  patch: unknown,
): Promise<RideResult> {
  return onRide(patchOf, { rideId, patch }, (data, ride, actor) =>
    rides.updateRideDetails(ride.id, data.patch, actor),
  );
}

const cancelOf = rideRef.extend({ cancel: cancelRideInput });

export async function cancelRideAction(
  rideId: string,
  input: unknown,
): Promise<RideResult<{ cancelledIds: string[] }>> {
  const parsed = cancelOf.safeParse({ rideId, cancel: input });
  if (!parsed.success) return INVALID;
  const admin = await adminOfRide(parsed.data.rideId);
  if (!admin) return { ok: false, error: "unknownRide" };
  return attempt(() =>
    rides.cancelRide(admin.ride.id, parsed.data.cancel, admin.actorUserId),
  );
}

export async function deleteRideAction(rideId: string): Promise<RideResult> {
  return onRide(rideRef, { rideId }, (_, ride, actor) =>
    rides.deleteRide(ride.id, actor),
  );
}

export async function setRideTrishawsAction(
  input: unknown,
): Promise<RideResult> {
  return onRide(rideTrishawsInput, input, (data, ride, actor) =>
    allocateTrishaws(ride, data.trishawIds, actor),
  );
}

export async function assignPilotAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRide(
    pilotInput,
    input,
    (data, ride, actor) => staffRide(ride, data.userId, actor),
    changed,
  );
}

export async function unassignPilotAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRide(
    pilotInput,
    input,
    (data, ride, actor) => rides.unassignVolunteer(ride.id, data.userId, actor),
    changed,
  );
}

export async function bookRiderAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRide(
    bookRiderInput,
    input,
    (data, ride, actor) =>
      bookRider(ride, data.passengerId, actor, data.position),
    changed,
  );
}

export async function setRideAnnouncedAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRide(
    announceInput,
    input,
    (data, ride, actor) => rides.setAnnounced(ride.id, data.announced, actor),
    changed,
  );
}

export async function reorderRosterAction(input: unknown): Promise<RideResult> {
  return onRide(reorderRosterInput, input, (data, _, actor) =>
    rides.reorderRoster(data, actor),
  );
}

export async function setRidePhotosAction(input: unknown): Promise<RideResult> {
  return onRide(ridePhotosInput, input, (data, _, actor) =>
    rides.setRidePhotos(data, actor),
  );
}

export async function removeRiderAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRide(
    riderInput,
    input,
    (data, ride, actor) =>
      rides.cancelBooking(ride.id, data.passengerId, actor),
    changed,
  );
}

export async function addRideNoteAction(input: unknown): Promise<RideResult> {
  return onRide(noteInput, input, (data, ride, actor) =>
    rides.addRideNote(ride.id, data.text, actor),
  );
}

/**
 * Any admin may stage a ride photo, because the drawer uploads before the ride
 * exists. Which ride it may join is checked when it is attached.
 */
export async function requestRidePhotoUploadAction(
  input: unknown,
): Promise<RideResult<{ key: string; url: string }>> {
  const parsed = uploadRequest.safeParse(input);
  if (!parsed.success) return INVALID;
  const { session } = await requireAdminScope();
  if (!withinUploadLimit(session.user.id))
    return { ok: false, error: "rateLimited" };
  return attempt(
    () => requestUpload(session.user.id, "ridePhoto", parsed.data),
    { revalidate: false },
  );
}

export async function commitRidePhotoUploadAction(
  input: unknown,
): Promise<RideResult<{ fileId: string }>> {
  const parsed = uploadCommit.safeParse(input);
  if (!parsed.success) return INVALID;
  const { session } = await requireAdminScope();
  return attempt(
    async () => {
      const file = await commitUpload(
        session.user.id,
        "ridePhoto",
        parsed.data.key,
      );
      return { fileId: file.id };
    },
    { revalidate: false },
  );
}

export async function listRidesPageAction(
  input: unknown,
): Promise<RideResult<ListRidePage>> {
  const parsed = rideListPageInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const { scope } = await requireAdminScope();
  const allowed = new Set(scope.chapters.map((chapter) => chapter.id));
  return attempt(
    async () =>
      toListPage(
        await rides.listRidesForList({
          ...parsed.data,
          chapterIds: parsed.data.chapterIds.filter((chapterId) =>
            allowed.has(chapterId),
          ),
        }),
      ),
    { revalidate: false },
  );
}

const ROUTE_LIMIT = { max: 30, windowMs: 60_000 };

export async function estimateRouteAction(
  input: unknown,
): Promise<RideResult<{ route: Route | null }>> {
  const parsed = routeEstimateInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const { session } = await requireAdminScope();
  if (!withinRateLimit(`route:${session.user.id}`, ROUTE_LIMIT))
    return { ok: false, error: "rateLimited" };
  return attempt(
    async () => ({
      route: await cyclingRoute(parsed.data.from, parsed.data.to),
    }),
    { revalidate: false },
  );
}

/**
 * A ride on the day is run by one of its own pilots — assigned, still piloting
 * in its chapter and not marked as a no-show — or by an admin of its chapter.
 * An admin who also pilots it acts as the admin, so the pilot's one-day window
 * never narrows what they may record. Anyone else is turned away by the admin
 * guard.
 */
async function executorOfRide(
  rideId: string,
): Promise<{ rideId: string; actorUserId: string; as: Executor } | null> {
  const session = await requireAuth();
  const ride = await rides.getRide(rideId);
  if (!ride) return null;
  const actorUserId = session.user.id;
  if (
    !isChapterAdmin(session.access, ride.chapterId, ride.chapter.countryId) &&
    (await rides.pilotCanRun(ride.id, actorUserId))
  )
    return { rideId: ride.id, actorUserId, as: "pilot" };
  await requireChapterAdmin(ride.chapterId);
  return { rideId: ride.id, actorUserId, as: "admin" };
}

async function onRideDay<
  S extends z.ZodType<{ rideId: string }>,
  R,
  T extends object = object,
>(
  schema: S,
  input: unknown,
  run: (
    data: z.output<S>,
    executor: { rideId: string; actorUserId: string; as: Executor },
  ) => Promise<R>,
  reply?: (result: R) => T,
  limit?: string,
): Promise<RideResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return INVALID;
  const executor = await executorOfRide(parsed.data.rideId);
  if (!executor) return { ok: false, error: "unknownRide" };
  if (limit && !withinRateLimit(`${limit}:${executor.actorUserId}`, DAY_LIMIT))
    return { ok: false, error: "rateLimited" };
  return attempt<T>(async () => {
    const result = await run(parsed.data, executor);
    return reply?.(result);
  });
}

const DAY_LIMIT = { max: 120, windowMs: 60 * 60_000 };

export async function setCheckedInAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRideDay(
    checkInInput,
    input,
    (data, { rideId, actorUserId, as }) =>
      rides.setCheckedIn(rideId, data.entryId, data.checkedIn, actorUserId, as),
    changed,
  );
}

export async function addWalkUpAction(
  input: unknown,
): Promise<RideResult<{ entryId: string }>> {
  return onRideDay(
    walkUpInput,
    input,
    (data, { actorUserId, as }) => rides.addWalkUp(data, actorUserId, as),
    (entryId) => ({ entryId }),
    "walk-up",
  );
}

export async function removeWalkUpAction(input: unknown): Promise<RideResult> {
  return onRideDay(rosterEntryRef, input, (data, { rideId, actorUserId, as }) =>
    rides.removeWalkUp(rideId, data.entryId, actorUserId, as),
  );
}

export async function completeRideAction(
  rideId: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRideDay(
    rideRef,
    { rideId },
    (_, { rideId: id, actorUserId, as }) => completeRide(id, actorUserId, as),
    (tally) => changed(tally !== null),
  );
}

export async function submitDebriefAction(input: unknown): Promise<RideResult> {
  return onRideDay(
    debriefInput,
    input,
    (data, { actorUserId, as }) => rides.submitDebrief(data, actorUserId, as),
    undefined,
    "debrief",
  );
}

/** Taking a closed roster back is the chapter's call, never the pilot's. */
export async function reopenRideAction(rideId: unknown): Promise<RideResult> {
  return onRide(rideRef, { rideId }, (_, ride, actor) =>
    rides.reopenRide(ride.id, actor),
  );
}

export async function setPilotNoShowAction(
  input: unknown,
): Promise<RideResult<{ changed: boolean }>> {
  return onRide(
    pilotNoShowInput,
    input,
    (data, ride, actor) =>
      rides.setPilotNoShow(ride.id, data.userId, data.noShow, actor),
    changed,
  );
}
