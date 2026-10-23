import { requireAuth } from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { cancelRideSeats, rescheduleRide } from "@/use-cases/reschedule-ride";
import { cancelOwnSeat } from "@/use-cases/cancel-own-seat";
import {
  cancelRideAction,
  cancelSeatAction,
  rescheduleRideAction,
} from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => ({ user: { id: "carer-1" } })),
}));
jest.mock("@/lib/rate-limit", () => ({ withinRateLimit: jest.fn(() => true) }));
jest.mock("@/use-cases/book-event-seat", () => ({ bookEventSeats: jest.fn() }));
jest.mock("@/use-cases/reschedule-ride", () => ({
  cancelRideSeats: jest.fn(async () => 1),
  rescheduleRide: jest.fn(async () => ({
    id: "request-1",
    rideId: null,
    oldSeatsKept: false,
  })),
}));
jest.mock("@/use-cases/cancel-own-seat", () => ({
  cancelOwnSeat: jest.fn(async () => true),
}));

const seat = { rideId: "ride-1", passengerId: "passenger-1" };

beforeEach(() => jest.clearAllMocks());

describe("giving up a seat", () => {
  const action = cancelSeatAction;
  const useCase = cancelOwnSeat;

  it("answers for the signed-in account, never one the client names", async () => {
    await expect(action({ ...seat, userId: "someone-else" })).resolves.toEqual({
      ok: true,
      changed: true,
    });
    expect(useCase).toHaveBeenCalledWith("ride-1", "passenger-1", "carer-1");
  });

  it("refuses malformed input before asking who is signed in", async () => {
    await expect(action({ rideId: "ride-1" })).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it("slows down a flood, with room for a carer's every rider", async () => {
    await action(seat);
    expect(withinRateLimit).toHaveBeenCalledWith("seat-answer:carer-1", {
      max: 60,
      windowMs: 3_600_000,
    });
    jest.clearAllMocks();
    (withinRateLimit as jest.Mock).mockReturnValueOnce(false);
    await expect(action(seat)).resolves.toEqual({
      ok: false,
      error: "rateLimited",
    });
    expect(useCase).not.toHaveBeenCalled();
  });

  it.each(["rideFull", "pleasureLimit", "rideClosed", "unknownPassenger"])(
    "says %s in words the page knows",
    async (code) => {
      (useCase as jest.Mock).mockRejectedValueOnce(
        new DomainError(code as "rideFull"),
      );
      await expect(action(seat)).resolves.toEqual({ ok: false, error: code });
    },
  );
});

describe("cancelling the whole ride", () => {
  it("cancels for the signed-in account only", async () => {
    await expect(
      cancelRideAction({ rideId: "ride-1", userId: "someone-else" }),
    ).resolves.toEqual({ ok: true, cancelled: 1 });
    expect(cancelRideSeats).toHaveBeenCalledWith("ride-1", "carer-1");
  });

  it("refuses malformed input before asking who is signed in", async () => {
    await expect(cancelRideAction({})).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(requireAuth).not.toHaveBeenCalled();
  });
});

describe("rescheduling", () => {
  const request = {
    passengerIds: ["passenger-1"],
    model: "pleasure",
    pickup: {
      name: "Sonnenhof",
      address: null,
      latitude: null,
      longitude: null,
    },
    window: { date: "2026-10-08", startMinute: 600, endMinute: 660 },
  };

  it("asks for the new ride as the signed-in account", async () => {
    await expect(
      rescheduleRideAction({ fromRideId: "ride-1", request }),
    ).resolves.toEqual({
      ok: true,
      id: "request-1",
      rideId: null,
      oldSeatsKept: false,
    });
    expect(rescheduleRide).toHaveBeenCalledWith(
      "ride-1",
      expect.objectContaining({ passengerIds: ["passenger-1"] }),
      "carer-1",
    );
  });

  it("refuses a request without the ride it replaces", async () => {
    await expect(rescheduleRideAction({ request })).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(rescheduleRide).not.toHaveBeenCalled();
  });

  it("says riderBooked in words the form knows", async () => {
    (rescheduleRide as jest.Mock).mockRejectedValueOnce(
      new DomainError("riderBooked"),
    );
    await expect(
      rescheduleRideAction({ fromRideId: "ride-1", request }),
    ).resolves.toEqual({ ok: false, error: "riderBooked" });
  });
});
