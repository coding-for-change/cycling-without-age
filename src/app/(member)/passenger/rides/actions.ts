"use server";

import { revalidatePath } from "next/cache";
import { seatBookingInput } from "@/features/rides";
import { requireAuth } from "@/lib/auth-guards";
import { createAttempt, type ActionResult } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { bookEventSeats } from "@/use-cases/book-event-seat";

const MAPPED_ERRORS = [
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
