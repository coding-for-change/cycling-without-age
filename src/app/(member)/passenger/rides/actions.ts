"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rideRequestInput } from "@/features/ride-requests";
import { rideRef, riderInput, seatBookingInput } from "@/features/rides";
import { requireAuth } from "@/lib/auth-guards";
import { createAttempt, type ActionResult } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { bookEventSeats } from "@/use-cases/book-event-seat";
import { cancelRideSeats, rescheduleRide } from "@/use-cases/reschedule-ride";
import { cancelOwnSeat } from "@/use-cases/cancel-own-seat";

const MAPPED_ERRORS = [
  "pleasureLimit",
  "rideClosed",
  "rideFull",
  "riderNotInChapter",
  "unknownPassenger",
  "unknownRide",
] as const;

export type SeatBookingError =
  (typeof MAPPED_ERRORS)[number] | "rateLimited" | "generic";

export type SeatBookingResult = ActionResult<
  SeatBookingError,
  { booked: number }
>;

const BOOKING_LIMIT = { max: 10, windowMs: 60 * 60_000 };
/** One answer per rider, and a carer may book for a dozen of them. */
const ANSWER_LIMIT = { max: 60, windowMs: 60 * 60_000 };

const revalidateRides = () => {
  revalidatePath("/passenger", "layout");
  revalidatePath("/pilot", "layout");
  revalidatePath("/admin", "layout");
};

const { attempt } = createAttempt(MAPPED_ERRORS, revalidateRides);

/**
 * A refusal because the ride moved on under the screen — it filled up or
 * closed — reloads the screen too, so it stops offering what is gone.
 */
const STALE: readonly SeatBookingError[] = [
  "rideClosed",
  "rideFull",
  "unknownRide",
];

const refreshedIfStale = (result: SeatBookingResult) => {
  if (!result.ok && STALE.includes(result.error)) revalidateRides();
  return result;
};

/**
 * Seats on an announced event, for riders this account manages. Which riders
 * those are, which chapter the event is in and whether a seat is left are all
 * read on the server; the client only names the ride and the riders.
 */
export async function bookEventSeatsAction(
  input: unknown,
): Promise<SeatBookingResult> {
  const parsed = seatBookingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();
  if (!withinRateLimit(`seat-booking:${session.user.id}`, BOOKING_LIMIT))
    return { ok: false, error: "rateLimited" };
  return refreshedIfStale(
    await attempt(async () => ({
      booked: await bookEventSeats(
        parsed.data.rideId,
        parsed.data.passengerIds,
        session.user.id,
      ),
    })),
  );
}

export type SeatAnswerResult = ActionResult<
  SeatBookingError,
  { changed: boolean }
>;

/**
 * Lifecycle 5B-b, from the reminder's link: the account gives up the seat of
 * a rider it books for, or its own. The use case asks which riders those are;
 * the client only names the ride and the rider.
 */
export async function cancelSeatAction(
  input: unknown,
): Promise<SeatAnswerResult> {
  const parsed = riderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();
  if (!withinRateLimit(`seat-answer:${session.user.id}`, ANSWER_LIMIT))
    return { ok: false, error: "rateLimited" };
  const result = await attempt(async () => ({
    changed: await cancelOwnSeat(
      parsed.data.rideId,
      parsed.data.passengerId,
      session.user.id,
    ),
  }));
  if (!result.ok && STALE.includes(result.error)) revalidateRides();
  return result;
}

export async function cancelRideAction(
  input: unknown,
): Promise<ActionResult<SeatBookingError, { cancelled: number }>> {
  const parsed = rideRef.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();
  if (!withinRateLimit(`seat-answer:${session.user.id}`, ANSWER_LIMIT))
    return { ok: false, error: "rateLimited" };
  const result = await attempt(async () => ({
    cancelled: await cancelRideSeats(parsed.data.rideId, session.user.id),
  }));
  if (!result.ok && STALE.includes(result.error)) revalidateRides();
  return result;
}

const RESCHEDULE_ERRORS = [
  "alreadyRequested",
  "beyondHorizon",
  "closedDate",
  "leadTime",
  "notChapterMember",
  "outsideHours",
  "rideClosed",
  "riderBooked",
  "riderNotInChapter",
  "tooManyRequests",
  "tooManyRiders",
  "unknownChapter",
  "unknownPassenger",
  "unknownRide",
] as const;

export type RescheduleError =
  (typeof RESCHEDULE_ERRORS)[number] | "rateLimited" | "generic";

const { attempt: rescheduleAttempt } = createAttempt(
  RESCHEDULE_ERRORS,
  revalidateRides,
);

const rescheduleInput = z.object({
  fromRideId: rideRef.shape.rideId,
  request: rideRequestInput,
});

const RESCHEDULE_LIMIT = { max: 10, windowMs: 60 * 60_000 };

export async function rescheduleRideAction(
  input: unknown,
): Promise<
  ActionResult<
    RescheduleError,
    { id: string; rideId: string | null; oldSeatsKept: boolean }
  >
> {
  const parsed = rescheduleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();
  if (!withinRateLimit(`ride-request:${session.user.id}`, RESCHEDULE_LIMIT))
    return { ok: false, error: "rateLimited" };
  return rescheduleAttempt(() =>
    rescheduleRide(
      parsed.data.fromRideId,
      parsed.data.request,
      session.user.id,
    ),
  );
}
