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
import { scheduleFromRequest } from "./schedule-from-request";

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
