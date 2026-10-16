import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rideRequests } from "@/features/ride-requests";
import {
  rides,
  scheduleRideForm,
  type ScheduleRideForm,
} from "@/features/rides";
import { DomainError, domainCode } from "@/lib/domain-error";
import {
  scheduleAutomatically,
  scheduleFromRequest,
} from "./schedule-from-request";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getSettings: jest.fn() },
}));
jest.mock("@/features/fleet", () => ({
  fleet: {
    assertUsable: jest.fn(),
    suitableTrishawIds: jest.fn(),
  },
}));
jest.mock("@/features/membership", () => ({
  membership: { getMembersRoles: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { getPassengers: jest.fn() },
}));
jest.mock("@/features/ride-locations", () => ({
  rideLocations: { requireUsableRideLocation: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  ...jest.requireActual("@/features/ride-requests/schemas"),
  rideRequests: {
    requirePending: jest.fn(),
    claim: jest.fn(),
    release: jest.fn(),
    markScheduled: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: { scheduleRide: jest.fn(), bookedTrishawIds: jest.fn() },
}));

const ADMIN = "user-admin";
const MUNICH = "chapter-muenchen";

const scheduleRide = rides.scheduleRide as jest.Mock;
const claim = rideRequests.claim as jest.Mock;
const suitableTrishawIds = fleet.suitableTrishawIds as jest.Mock;
const bookedTrishawIds = rides.bookedTrishawIds as jest.Mock;

const REQUEST = {
  id: "request-1",
  chapterId: MUNICH,
  status: "pending",
  passengers: [
    { passenger: { id: "mother", chapterId: MUNICH } },
    { passenger: { id: "father", chapterId: MUNICH } },
  ],
};

const form = (overrides: Partial<ScheduleRideForm> = {}) =>
  scheduleRideForm.parse({
    chapterId: MUNICH,
    model: "functional",
    slot: { date: "2026-10-08", start: "10:00", durationMinutes: 45 },
    roundTrip: true,
    stayMinutes: 60,
    destinationName: "Hausarzt Dr. Weber",
    trishawIds: ["trishaw-1"],
    passengerIds: ["mother", "father"],
    ...overrides,
  });

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

beforeEach(() => {
  jest.clearAllMocks();
  (rideRequests.requirePending as jest.Mock).mockResolvedValue(REQUEST);
  (chapters.getChapter as jest.Mock).mockResolvedValue({
    id: MUNICH,
    timeZone: "Europe/Berlin",
  });
  (chapters.getSettings as jest.Mock).mockResolvedValue(
    DEFAULT_CHAPTER_SETTINGS,
  );
  (fleet.assertUsable as jest.Mock).mockResolvedValue([]);
  (passengers.getPassengers as jest.Mock).mockResolvedValue([
    { id: "mother", chapterId: MUNICH },
    { id: "father", chapterId: MUNICH },
  ]);
  (membership.getMembersRoles as jest.Mock).mockResolvedValue(new Map());
  scheduleRide.mockResolvedValue({ id: "ride-1", returnLegId: "ride-2" });
});

describe("scheduleFromRequest", () => {
  it("rosters the request's riders on both legs and links the way there", async () => {
    expect(await scheduleFromRequest("request-1", form(), ADMIN)).toEqual({
      id: "ride-1",
      returnLegId: "ride-2",
    });

    const [ride, actor, options] = scheduleRide.mock.calls[0];
    expect(actor).toBe(ADMIN);
    expect(ride.chapterId).toBe(MUNICH);
    expect(ride.passengerIds).toEqual(["mother", "father"]);
    expect(ride.startsAt).toEqual(new Date("2026-10-08T08:00:00Z"));
    expect(ride.returnLeg).toEqual({
      startsAt: new Date("2026-10-08T09:45:00Z"),
      endsAt: new Date("2026-10-08T10:30:00Z"),
    });
    expect(options.requestId).toBe("request-1");
    expect(rideRequests.markScheduled).toHaveBeenCalledWith(
      "request-1",
      { id: "ride-1", returnLegId: "ride-2" },
      ADMIN,
    );
  });

  it("claims the request before the ride is written", async () => {
    const order: string[] = [];
    claim.mockImplementation(async () => order.push("claim"));
    scheduleRide.mockImplementation(async () => {
      order.push("ride");
      return { id: "ride-1", returnLegId: null };
    });
    await scheduleFromRequest("request-1", form(), ADMIN);
    expect(order).toEqual(["claim", "ride"]);
  });

  it("makes one ride of a request two admins schedule at once", async () => {
    claim.mockRejectedValueOnce(new DomainError("requestNotPending"));
    expect(await codeOf(scheduleFromRequest("request-1", form(), ADMIN))).toBe(
      "requestNotPending",
    );
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("hands the request back when the ride cannot be written", async () => {
    scheduleRide.mockRejectedValue(new DomainError("trishawReserved"));
    expect(await codeOf(scheduleFromRequest("request-1", form(), ADMIN))).toBe(
      "trishawReserved",
    );
    expect(rideRequests.release).toHaveBeenCalledWith("request-1");
    expect(rideRequests.markScheduled).not.toHaveBeenCalled();
  });

  it("never schedules into a chapter other than the request's", async () => {
    expect(
      await codeOf(
        scheduleFromRequest(
          "request-1",
          form({ chapterId: "chapter-hamburg" }),
          ADMIN,
        ),
      ),
    ).toBe("riderNotInChapter");
    expect(claim).not.toHaveBeenCalled();
  });

  it("never leaves one of the request's riders behind", async () => {
    expect(
      await codeOf(
        scheduleFromRequest(
          "request-1",
          form({ passengerIds: ["mother"] }),
          ADMIN,
        ),
      ),
    ).toBe("unknownPassenger");
    expect(claim).not.toHaveBeenCalled();
  });

  it("refuses a request that was already decided", async () => {
    (rideRequests.requirePending as jest.Mock).mockRejectedValue(
      new DomainError("requestNotPending"),
    );
    expect(await codeOf(scheduleFromRequest("request-1", form(), ADMIN))).toBe(
      "requestNotPending",
    );
  });
});

describe("scheduleAutomatically", () => {
  const SUITABLE = ["trishaw-1", "trishaw-2"];
  const at = (time: string) => new Date(`2026-10-08T${time}:00Z`);
  const rider = (id: string, needsWheelchairBike = false) => ({
    passenger: { id, chapterId: MUNICH, needsWheelchairBike },
  });
  const pending = (overrides: Record<string, unknown> = {}) => ({
    ...REQUEST,
    model: "pleasure",
    roundTrip: false,
    requestedStartsAt: at("08:00"),
    requestedEndsAt: at("10:00"),
    rideLocationId: null,
    pickupName: "Sonnenhof",
    pickupAddress: "Am Hof 1",
    pickupLatitude: 48.1,
    pickupLongitude: 11.5,
    destinationName: null,
    destinationAddress: null,
    destinationLatitude: null,
    destinationLongitude: null,
    passengers: [rider("mother"), rider("father")],
    ...overrides,
  });
  const roundTrip = () =>
    pending({
      model: "functional",
      roundTrip: true,
      destinationName: "Hausarzt Dr. Weber",
    });
  const asking = (request: ReturnType<typeof pending>) =>
    (rideRequests.requirePending as jest.Mock).mockResolvedValue(request);
  const scheduledRide = () => scheduleRide.mock.calls[0][0];

  beforeEach(() => {
    asking(pending());
    suitableTrishawIds.mockResolvedValue(SUITABLE);
    bookedTrishawIds.mockResolvedValue(new Set());
    scheduleRide.mockResolvedValue({ id: "ride-1", returnLegId: null });
  });

  it("asks the fleet for trishaws that seat every rider and take a wheelchair when one rider needs it", async () => {
    await scheduleAutomatically("request-1");
    expect(suitableTrishawIds).toHaveBeenLastCalledWith(MUNICH, {
      count: 2,
      wheelchair: false,
    });

    asking(pending({ passengers: [rider("mother"), rider("father", true)] }));
    await scheduleAutomatically("request-1");
    expect(suitableTrishawIds).toHaveBeenLastCalledWith(MUNICH, {
      count: 2,
      wheelchair: true,
    });
  });

  it("leaves a request without riders for an admin", async () => {
    asking(pending({ passengers: [] }));
    expect(await scheduleAutomatically("request-1")).toBeNull();
    expect(suitableTrishawIds).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
  });

  it("leaves the request for an admin when no trishaw suits its riders", async () => {
    suitableTrishawIds.mockResolvedValue([]);
    expect(await scheduleAutomatically("request-1")).toBeNull();
    expect(bookedTrishawIds).not.toHaveBeenCalled();
    expect(claim).not.toHaveBeenCalled();
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("leaves the request for an admin when every suitable trishaw is booked", async () => {
    bookedTrishawIds.mockResolvedValue(new Set(SUITABLE));
    expect(await scheduleAutomatically("request-1")).toBeNull();
    expect(claim).not.toHaveBeenCalled();
    expect(scheduleRide).not.toHaveBeenCalled();
    expect(rideRequests.markScheduled).not.toHaveBeenCalled();
  });

  it("checks both windows of a functional round trip and books the way back", async () => {
    asking(roundTrip());
    scheduleRide.mockResolvedValue({ id: "ride-1", returnLegId: "ride-2" });
    expect(await scheduleAutomatically("request-1")).toEqual({
      id: "ride-1",
      returnLegId: "ride-2",
    });
    const there = { startsAt: at("08:00"), endsAt: at("09:00") };
    const back = { startsAt: at("10:00"), endsAt: at("11:00") };
    expect(bookedTrishawIds).toHaveBeenCalledWith(SUITABLE, [there, back]);
    expect(scheduledRide()).toEqual(
      expect.objectContaining({
        model: "functional",
        ...there,
        destinationName: "Hausarzt Dr. Weber",
        returnLeg: back,
      }),
    );
    expect(rideRequests.markScheduled).toHaveBeenCalledWith(
      "request-1",
      { id: "ride-1", returnLegId: "ride-2" },
      null,
    );
  });

  it("checks one window and books no way back for a ride there only", async () => {
    asking(pending({ model: "functional", destinationName: "Dr. Weber" }));
    await scheduleAutomatically("request-1");
    expect(bookedTrishawIds).toHaveBeenCalledWith(SUITABLE, [
      { startsAt: at("08:00"), endsAt: at("09:00") },
    ]);
    expect(scheduledRide().returnLeg).toBeUndefined();
  });

  it("gives the ride the chapter's ride length from the start of the asked window", async () => {
    await scheduleAutomatically("request-1");
    expect(scheduledRide()).toEqual(
      expect.objectContaining({ startsAt: at("08:00"), endsAt: at("09:00") }),
    );
  });

  it("keeps the ride inside a window shorter than the chapter's ride length", async () => {
    asking(pending({ requestedEndsAt: at("08:45") }));
    await scheduleAutomatically("request-1");
    expect(bookedTrishawIds).toHaveBeenCalledWith(SUITABLE, [
      { startsAt: at("08:00"), endsAt: at("08:45") },
    ]);
    expect(scheduledRide()).toEqual(
      expect.objectContaining({ startsAt: at("08:00"), endsAt: at("08:45") }),
    );
  });

  it("claims the request, lets the ride pick among the candidates and links the ride", async () => {
    (chapters.getSettings as jest.Mock).mockResolvedValue({
      ...DEFAULT_CHAPTER_SETTINGS,
      pilotsMaySelfAssign: false,
      staffingCheckLeadHours: 24,
      requiredPilotsDefault: 2,
    });
    asking(roundTrip());
    scheduleRide.mockResolvedValue({ id: "ride-1", returnLegId: "ride-2" });
    await scheduleAutomatically("request-1");

    expect(claim).toHaveBeenCalledWith("request-1", null);
    const [ride, actor, options] = scheduleRide.mock.calls[0];
    expect(actor).toBeNull();
    expect(ride).toEqual(
      expect.objectContaining({
        chapterId: MUNICH,
        passengerIds: ["mother", "father"],
        trishawIds: [],
        requiredPilots: 2,
        locationName: "Sonnenhof",
        locationAddress: "Am Hof 1",
      }),
    );
    expect(options).toEqual({
      opensForSignUp: false,
      staffingLeadHours: 24,
      requestId: "request-1",
      pickTrishaws: { candidates: SUITABLE, count: 1 },
    });
    expect(rideRequests.markScheduled).toHaveBeenCalledWith(
      "request-1",
      { id: "ride-1", returnLegId: "ride-2" },
      null,
    );
    expect(claim.mock.invocationCallOrder[0]).toBeLessThan(
      scheduleRide.mock.invocationCallOrder[0],
    );
    expect(scheduleRide.mock.invocationCallOrder[0]).toBeLessThan(
      (rideRequests.markScheduled as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it("staffs a ride out with one pilot, whatever the chapter's default", async () => {
    (chapters.getSettings as jest.Mock).mockResolvedValue({
      ...DEFAULT_CHAPTER_SETTINGS,
      requiredPilotsDefault: 3,
    });
    await scheduleAutomatically("request-1");
    expect(scheduledRide().requiredPilots).toBe(1);
  });

  it("starts the ride at the request's Ride Location and its coordinates", async () => {
    asking(
      pending({
        rideLocationId: "location-1",
        pickupLatitude: 48.15,
        pickupLongitude: 11.58,
      }),
    );
    await scheduleAutomatically("request-1");
    expect(scheduledRide()).toEqual(
      expect.objectContaining({
        rideLocationId: "location-1",
        locationName: "Sonnenhof",
        locationAddress: "Am Hof 1",
        latitude: 48.15,
        longitude: 11.58,
      }),
    );
  });

  it("offers every candidate, not only the ones free when it looked", async () => {
    bookedTrishawIds.mockResolvedValue(new Set(["trishaw-1"]));
    await scheduleAutomatically("request-1");
    expect(scheduleRide.mock.calls[0][2].pickTrishaws).toEqual({
      candidates: SUITABLE,
      count: 1,
    });
  });

  it("makes no second ride of a request another write claimed first", async () => {
    claim.mockRejectedValueOnce(new DomainError("requestNotPending"));
    expect(await scheduleAutomatically("request-1")).toBeNull();
    expect(scheduleRide).not.toHaveBeenCalled();
  });

  it("hands the request back when the lock finds every trishaw gone", async () => {
    scheduleRide.mockRejectedValue(new DomainError("noTrishawFree"));
    expect(await scheduleAutomatically("request-1")).toBeNull();
    expect(rideRequests.release).toHaveBeenCalledWith("request-1");
    expect(rideRequests.markScheduled).not.toHaveBeenCalled();
  });

  it("hands the request back and rethrows when the write fails for another reason", async () => {
    const failure = new Error("connection lost");
    scheduleRide.mockRejectedValue(failure);
    await expect(scheduleAutomatically("request-1")).rejects.toBe(failure);
    expect(rideRequests.release).toHaveBeenCalledWith("request-1");
    expect(rideRequests.markScheduled).not.toHaveBeenCalled();
  });
});
