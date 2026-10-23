"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { scheduleRideForm } from "@/features/rides/schemas";
import {
  requireAdminScope,
  requireAuth,
  requireChapterAdmin,
} from "@/lib/auth-guards";
import { createAttempt, type ActionResult } from "@/lib/domain-error";
import { cyclingRoute } from "@/lib/mapbox";
import { withinRateLimit } from "@/lib/rate-limit";
import { trishawRoute } from "@/lib/trishaw-pace";
import { changeRideRequest } from "@/use-cases/change-ride-request";
import { scheduleFromRequest } from "@/use-cases/schedule-from-request";
import { submitRideRequest } from "@/use-cases/submit-ride-request";
import { rideRequests } from "./index";
import {
  decisionInput,
  id,
  rideRequestInput,
  routePreviewInput,
} from "./schemas";

const REQUEST_ERRORS = [
  "alreadyRequested",
  "beyondHorizon",
  "closedDate",
  "leadTime",
  "notChapterMember",
  "outsideHours",
  "requestNotPending",
  "riderBooked",
  "riderNotInChapter",
  "tooManyRequests",
  "tooManyRiders",
  "unknownChapter",
  "unknownPassenger",
  "unknownRequest",
] as const;

export type RideRequestError =
  (typeof REQUEST_ERRORS)[number] | "rateLimited" | "generic";

export type RideRequestResult<T extends object = object> = ActionResult<
  RideRequestError,
  T
>;

const INVALID = { ok: false, error: "generic" } as const;

const SUBMIT_LIMIT = { max: 10, windowMs: 60 * 60_000 };
const WITHDRAW_LIMIT = { max: 30, windowMs: 60 * 60_000 };

/**
 * A request shows on the requester's pages and on the admins' list and week,
 * and scheduling one puts a ride on every calendar it reaches.
 */
const revalidateRequests = () => {
  revalidatePath("/passenger", "layout");
  revalidatePath("/pilot", "layout");
  revalidatePath("/admin", "layout");
};

const { attempt } = createAttempt(REQUEST_ERRORS, revalidateRequests);

/**
 * Lifecycle 1C. The client names riders and a window; which chapter that is,
 * whether the account may book for them and whether the chapter would take
 * the window are all decided on the server.
 */
export async function submitRideRequestAction(
  input: unknown,
): Promise<RideRequestResult<{ id: string; rideId: string | null }>> {
  const parsed = rideRequestInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireAuth();
  if (!withinRateLimit(`ride-request:${session.user.id}`, SUBMIT_LIMIT))
    return { ok: false, error: "rateLimited" };
  return attempt(() => submitRideRequest(parsed.data, session.user.id));
}

const changeInput = z.object({
  fromRequestId: id,
  request: rideRequestInput,
});

/**
 * The new request goes through the same checks as any other; the old one is
 * read on the server and must belong to this account and still be open.
 */
export async function changeRideRequestAction(input: unknown): Promise<
  RideRequestResult<{
    id: string;
    rideId: string | null;
    oldRequestKept: boolean;
  }>
> {
  const parsed = changeInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireAuth();
  if (!withinRateLimit(`ride-request:${session.user.id}`, SUBMIT_LIMIT))
    return { ok: false, error: "rateLimited" };
  return attempt(() =>
    changeRideRequest(
      parsed.data.fromRequestId,
      parsed.data.request,
      session.user.id,
    ),
  );
}

export type RoutePreview = {
  path: [number, number][];
  distanceM: number;
  durationSec: number;
};

const ROUTE_PREVIEW_LIMIT = { max: 30, windowMs: 60_000 };

export async function previewRequestRouteAction(
  input: unknown,
): Promise<RoutePreview | null> {
  const session = await requireAuth();
  const parsed = routePreviewInput.safeParse(input);
  if (!parsed.success) return null;
  if (
    !withinRateLimit(
      `ride-request-route:${session.user.id}`,
      ROUTE_PREVIEW_LIMIT,
    )
  )
    return null;
  const route = trishawRoute(
    await cyclingRoute(parsed.data.from, parsed.data.to),
  );
  return (
    route && {
      path: route.path,
      distanceM: route.distanceM,
      durationSec: route.durationSec,
    }
  );
}

/** Who sent the request and whether it is still open are the facade's to check. */
export async function withdrawRideRequestAction(
  requestId: unknown,
): Promise<RideRequestResult> {
  const parsed = id.safeParse(requestId);
  if (!parsed.success) return INVALID;
  const session = await requireAuth();
  if (
    !withinRateLimit(`ride-request-withdraw:${session.user.id}`, WITHDRAW_LIMIT)
  )
    return { ok: false, error: "rateLimited" };
  return attempt(() => rideRequests.withdraw(parsed.data, session.user.id));
}

/**
 * Every decision is authorised by the request's own chapter, read from the
 * database. Someone with no admin scope at all is turned away first, and a
 * request outside the admin's reach reads as a missing one.
 */
async function adminOfRequest(requestId: string) {
  const { scope } = await requireAdminScope();
  const request = await rideRequests.getRequest(requestId);
  if (!request || !scope.chapters.some((c) => c.id === request.chapterId))
    return null;
  const { user } = await requireChapterAdmin(request.chapterId);
  return { request, actorUserId: user.id };
}

export async function declineRideRequestAction(
  input: z.input<typeof decisionInput>,
): Promise<RideRequestResult> {
  const parsed = decisionInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const admin = await adminOfRequest(parsed.data.requestId);
  if (!admin) return { ok: false, error: "unknownRequest" };
  return attempt(() =>
    rideRequests.decline(admin.request.id, admin.actorUserId, parsed.data.note),
  );
}

const SCHEDULE_ERRORS = [
  ...REQUEST_ERRORS,
  "capacityBelowRoster",
  "destinationRequired",
  "invalidFile",
  "legsOverlap",
  "notPilot",
  "pilotsFull",
  "pleasureLimit",
  "rideFull",
  "tooManyPilots",
  "trishawNotInChapter",
  "trishawReserved",
  "trishawUnavailable",
  "unknownTrishaw",
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

export type ScheduleRequestError =
  (typeof SCHEDULE_ERRORS)[number] | FormError | "generic";

const isFormError = (message: string): message is FormError =>
  (FORM_ERRORS as readonly string[]).includes(message);

const { attempt: scheduleAttempt } = createAttempt(
  SCHEDULE_ERRORS,
  revalidateRequests,
);

const namedRiders = (input: object) => {
  const named = (input as { passengerIds?: unknown }).passengerIds;
  return Array.isArray(named)
    ? named.filter((value): value is string => typeof value === "string")
    : [];
};

/**
 * The drawer arrives prefilled, but nothing it sends about the chapter or the
 * riders is trusted: the ride is the request's chapter's and carries the
 * request's riders, whatever the form says.
 */
export async function scheduleRideRequestAction(
  requestId: unknown,
  input: unknown,
): Promise<ActionResult<ScheduleRequestError, { id: string }>> {
  const parsedId = id.safeParse(requestId);
  if (!parsedId.success || typeof input !== "object" || input === null)
    return INVALID;
  const admin = await adminOfRequest(parsedId.data);
  if (!admin) return { ok: false, error: "unknownRequest" };
  const riders = admin.request.passengers.map(({ passenger }) => passenger.id);
  const parsed = scheduleRideForm.safeParse({
    ...input,
    chapterId: admin.request.chapterId,
    passengerIds: [...new Set([...riders, ...namedRiders(input)])],
  });
  if (!parsed.success) {
    const known = parsed.error.issues.find((issue) =>
      isFormError(issue.message),
    );
    return { ok: false, error: (known?.message as FormError) ?? "generic" };
  }
  return scheduleAttempt(async () => {
    const ride = await scheduleFromRequest(
      admin.request.id,
      parsed.data,
      admin.actorUserId,
    );
    return { id: ride.id };
  });
}
