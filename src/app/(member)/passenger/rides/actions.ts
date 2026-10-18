"use server";

import { revalidatePath } from "next/cache";
import { riderInput, seatBookingInput } from "@/features/rides";
import { requireAuth } from "@/lib/auth-guards";
import { createAttempt, type ActionResult } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { bookEventSeats } from "@/use-cases/book-event-seat";
import { cancelOwnSeat, confirmOwnSeat } from "@/use-cases/seat-confirmation";

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
 * Lifecycle 5B-b, from the reminder's link: the account confirms or gives up
 * the seat of a rider it books for, or its own. The use case asks which riders
 * those are; the client only names the ride and the rider.
 */
async function answerSeat(
  input: unknown,
  answer: typeof confirmOwnSeat,
): Promise<SeatAnswerResult> {
  const parsed = riderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireAuth();
  if (!withinRateLimit(`seat-answer:${session.user.id}`, ANSWER_LIMIT))
    return { ok: false, error: "rateLimited" };
  const result = await attempt(async () => ({
    changed: await answer(
      parsed.data.rideId,
      parsed.data.passengerId,
      session.user.id,
    ),
  }));
  if (!result.ok && STALE.includes(result.error)) revalidateRides();
  return result;
}

export async function confirmSeatAction(
  input: unknown,
): Promise<SeatAnswerResult> {
  return answerSeat(input, confirmOwnSeat);
}

export async function cancelSeatAction(
  input: unknown,
): Promise<SeatAnswerResult> {
  return answerSeat(input, cancelOwnSeat);
}
