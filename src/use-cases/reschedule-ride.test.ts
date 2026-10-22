import { passengers } from "@/features/passengers";
import type { RideRequestInput } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { cancelRideSeats, rescheduleRide } from "./reschedule-ride";
import { submitRideRequest } from "./submit-ride-request";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { listRidersOfAccount: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { getRideForPassengers: jest.fn(), cancelSeat: jest.fn() },
}));
jest.mock("./submit-ride-request", () => ({ submitRideRequest: jest.fn() }));

const CARER = "carer";
const NOW = new Date("2026-10-05T08:00:00Z");
const INPUT = { model: "pleasure" } as unknown as RideRequestInput;

const getRide = rides.getRideForPassengers as jest.Mock;
const cancelSeat = rides.cancelSeat as jest.Mock;
const submit = submitRideRequest as jest.Mock;

const ride = (overrides: Record<string, unknown> = {}) => ({
  id: "ride-1",
  model: "pleasure",
  status: "scheduled",
  startsAt: new Date("2026-10-08T08:00:00Z"),
  returnLeg: null,
  returnLegOf: null,
  roster: [
    { attendance: "booked", passenger: { id: "mother" } },
    { attendance: "cancelled", passenger: { id: "father" } },
  ],
  ...overrides,
});

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

beforeEach(() => {
  jest.clearAllMocks();
  (passengers.listRidersOfAccount as jest.Mock).mockResolvedValue([
    { id: "mother" },
    { id: "father" },
  ]);
  getRide.mockResolvedValue(ride());
  submit.mockResolvedValue({ id: "request-1", rideId: null });
  cancelSeat.mockResolvedValue(true);
});

describe("rescheduleRide", () => {
  it("reads the old ride only through the account's own riders", async () => {
    await rescheduleRide("ride-1", INPUT, CARER, NOW);
    expect(passengers.listRidersOfAccount).toHaveBeenCalledWith(CARER);
    expect(getRide).toHaveBeenCalledWith("ride-1", ["mother", "father"]);
  });

  it("refuses a ride none of the account's riders is on", async () => {
    getRide.mockResolvedValue(null);
    expect(await codeOf(rescheduleRide("ride-x", INPUT, CARER, NOW))).toBe(
      "unknownRide",
    );
    expect(submit).not.toHaveBeenCalled();
    expect(cancelSeat).not.toHaveBeenCalled();
  });

  it("refuses an event, a ride already under way and a seat already given up", async () => {
    for (const overrides of [
      { model: "event" },
      { startsAt: new Date("2026-10-05T07:00:00Z") },
      { status: "cancelled" },
      { roster: [{ attendance: "cancelled", passenger: { id: "mother" } }] },
    ]) {
      getRide.mockResolvedValueOnce(ride(overrides));
      expect(await codeOf(rescheduleRide("ride-1", INPUT, CARER, NOW))).toBe(
        "rideClosed",
      );
    }
    expect(submit).not.toHaveBeenCalled();
    expect(cancelSeat).not.toHaveBeenCalled();
  });

  it("asks for the new ride first, then gives up only the seats still held", async () => {
    const order: string[] = [];
    submit.mockImplementation(async () => {
      order.push("submit");
      return { id: "request-1", rideId: "ride-2" };
    });
    cancelSeat.mockImplementation(async (_ride, passengerId) => {
      order.push(`cancel:${passengerId}`);
      return true;
    });

    const result = await rescheduleRide("ride-1", INPUT, CARER, NOW);

    expect(order).toEqual(["submit", "cancel:mother"]);
    expect(cancelSeat).toHaveBeenCalledWith("ride-1", "mother", CARER, NOW);
    expect(result).toEqual({
      id: "request-1",
      rideId: "ride-2",
      oldSeatsKept: false,
    });
  });

  it("lets the new window overlap both legs of the ride it replaces", async () => {
    getRide.mockResolvedValue(
      ride({ returnLeg: { id: "ride-1-back" }, returnLegOf: null }),
    );
    await rescheduleRide("ride-1", INPUT, CARER, NOW);
    expect(submit).toHaveBeenCalledWith(INPUT, CARER, NOW, {
      replacesRideIds: ["ride-1", "ride-1-back"],
    });
  });

  it("keeps the old seat when the new request is refused", async () => {
    submit.mockRejectedValue(new Error("leadTime"));
    await expect(rescheduleRide("ride-1", INPUT, CARER, NOW)).rejects.toThrow(
      "leadTime",
    );
    expect(cancelSeat).not.toHaveBeenCalled();
  });

  it("still reports the new request when the old seat could not be given up", async () => {
    cancelSeat.mockRejectedValue(new Error("rideClosed"));
    const result = await rescheduleRide("ride-1", INPUT, CARER, NOW);
    expect(result).toEqual({
      id: "request-1",
      rideId: null,
      oldSeatsKept: true,
    });
  });
});

describe("cancelRideSeats", () => {
  it("gives up every seat the account still holds on the ride", async () => {
    getRide.mockResolvedValue(
      ride({
        roster: [
          { attendance: "booked", passenger: { id: "mother" } },
          { attendance: "booked", passenger: { id: "father" } },
        ],
      }),
    );
    expect(await cancelRideSeats("ride-1", CARER, NOW)).toBe(2);
    expect(cancelSeat).toHaveBeenNthCalledWith(
      1,
      "ride-1",
      "mother",
      CARER,
      NOW,
    );
    expect(cancelSeat).toHaveBeenNthCalledWith(
      2,
      "ride-1",
      "father",
      CARER,
      NOW,
    );
  });

  it("refuses a ride that is not the account's", async () => {
    getRide.mockResolvedValue(null);
    expect(await codeOf(cancelRideSeats("ride-x", CARER, NOW))).toBe(
      "unknownRide",
    );
    expect(cancelSeat).not.toHaveBeenCalled();
  });
});
