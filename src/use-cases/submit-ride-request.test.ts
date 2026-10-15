import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rideLocations } from "@/features/ride-locations";
import { rideRequests, type RideRequestInput } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { DomainError, domainCode } from "@/lib/domain-error";
import { maxRidersFor, submitRideRequest } from "./submit-ride-request";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    getSettings: jest.fn(),
    getOperatingHours: jest.fn(),
  },
}));
jest.mock("@/features/fleet", () => ({
  fleet: { listTrishaws: jest.fn(), isGrounded: jest.fn(() => false) },
}));
jest.mock("@/features/membership", () => ({
  membership: { listMembershipsOfUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  ...jest.requireActual("@/features/passengers/pickup"),
  passengers: { listPassengersManagedBy: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn().mockResolvedValue(null) },
}));
jest.mock("@/features/ride-locations", () => ({
  rideLocations: { requireUsableRideLocation: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  ...jest.requireActual("@/features/ride-requests/schemas"),
  rideRequests: {
    submit: jest.fn(),
    announce: jest.fn(),
    requirePending: jest.fn(),
    claim: jest.fn(),
    release: jest.fn(),
    markScheduled: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: { bookedTrishawIds: jest.fn(), scheduleRide: jest.fn() },
}));
jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));

const CARER = "user-carer";
const MUNICH = "chapter-muenchen";
const NOW = new Date("2026-10-05T08:00:00Z");

const submit = rideRequests.submit as jest.Mock;
const scheduleRide = rides.scheduleRide as jest.Mock;

const settings = (overrides: object = {}) => ({
  ...DEFAULT_CHAPTER_SETTINGS,
  bookingLeadTimeHours: 48,
  bookingHorizonDays: 30,
  ...overrides,
});

const MORNINGS = {
  windows: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    startMinute: 600,
    endMinute: 720,
  })),
  closures: [] as string[],
};

const request = (overrides: Partial<RideRequestInput> = {}) =>
  ({
    passengerIds: ["mother"],
    model: "pleasure",
    pickup: {
      name: "Home",
      address: "Lindenweg 3",
      latitude: 48.1,
      longitude: 11.5,
    },
    window: { date: "2026-10-08", startMinute: 600, endMinute: 660 },
    ...overrides,
  }) as RideRequestInput;

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

const pendingRequest = {
  id: "request-1",
  chapterId: MUNICH,
  model: "pleasure",
  roundTrip: false,
  requestedStartsAt: new Date("2026-10-08T08:00:00Z"),
  requestedEndsAt: new Date("2026-10-08T09:00:00Z"),
  rideLocationId: null,
  pickupName: "Home",
  pickupAddress: "Lindenweg 3",
  pickupLatitude: 48.1,
  pickupLongitude: 11.5,
  destinationName: null,
  destinationAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  passengers: [{ passenger: { id: "mother", needsWheelchairBike: false } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  (passengers.listPassengersManagedBy as jest.Mock).mockResolvedValue([
    { id: "mother", firstName: "Erna", lastName: "Huber", chapterId: MUNICH },
    { id: "father", firstName: "Karl", lastName: "Huber", chapterId: MUNICH },
    {
      id: "aunt",
      firstName: "Ilse",
      lastName: "Berg",
      chapterId: "chapter-hh",
    },
  ]);
  (membership.listMembershipsOfUser as jest.Mock).mockResolvedValue([
    { chapterId: MUNICH, roles: ["passenger"] },
  ]);
  (chapters.getChapter as jest.Mock).mockResolvedValue({
    id: MUNICH,
    timeZone: "Europe/Berlin",
  });
  (chapters.getSettings as jest.Mock).mockResolvedValue(settings());
  (chapters.getOperatingHours as jest.Mock).mockResolvedValue(MORNINGS);
  (fleet.listTrishaws as jest.Mock).mockResolvedValue([
    {
      id: "trishaw-1",
      status: "active",
      type: { seats: 2, wheelchairAccessible: false },
    },
  ]);
  submit.mockResolvedValue({ id: "request-1", chapterId: MUNICH });
  (rideRequests.requirePending as jest.Mock).mockResolvedValue(pendingRequest);
  (rides.bookedTrishawIds as jest.Mock).mockResolvedValue(new Set());
  scheduleRide.mockImplementation(async (_ride, _actor, options) => {
    expect(options.pickTrishaws.candidates).toEqual(["trishaw-1"]);
    return { id: "ride-1", returnLegId: null };
  });
});

describe("submitRideRequest", () => {
  it("files the request in the riders' own chapter, as wall-clock instants", async () => {
    expect(await submitRideRequest(request(), CARER, NOW)).toEqual({
      id: "request-1",
      rideId: null,
    });
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterId: MUNICH,
        requesterUserId: CARER,
        passengerIds: ["mother"],
        requestedStartsAt: new Date("2026-10-08T08:00:00Z"),
        requestedEndsAt: new Date("2026-10-08T09:00:00Z"),
        pickupName: "Home",
        roundTrip: false,
      }),
      { announce: true },
    );
  });

  it("copies a Ride Location's place over the one the client sent", async () => {
    (rideLocations.requireUsableRideLocation as jest.Mock).mockResolvedValue({
      id: "location-1",
      name: "Sonnenhof",
      address: "Am Hof 1",
      latitude: 48.2,
      longitude: 11.6,
    });
    await submitRideRequest(
      request({ rideLocationId: "location-1" }),
      CARER,
      NOW,
    );
    expect(rideLocations.requireUsableRideLocation).toHaveBeenCalledWith(
      "location-1",
      MUNICH,
    );
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        rideLocationId: "location-1",
        pickupName: "Sonnenhof",
        pickupAddress: "Am Hof 1",
      }),
      expect.anything(),
    );
  });

  it("refuses a rider this account does not manage", async () => {
    expect(
      await codeOf(
        submitRideRequest(request({ passengerIds: ["stranger"] }), CARER, NOW),
      ),
    ).toBe("unknownPassenger");
    expect(submit).not.toHaveBeenCalled();
  });

  it("refuses riders of two chapters in one request", async () => {
    expect(
      await codeOf(
        submitRideRequest(
          request({ passengerIds: ["mother", "aunt"] }),
          CARER,
          NOW,
        ),
      ),
    ).toBe("riderNotInChapter");
  });

  it("refuses an account that is no longer a member of the riders' chapter", async () => {
    (membership.listMembershipsOfUser as jest.Mock).mockResolvedValue([]);
    expect(await codeOf(submitRideRequest(request(), CARER, NOW))).toBe(
      "notChapterMember",
    );
  });

  it("refuses more riders than the chapter's largest trishaw seats", async () => {
    (fleet.listTrishaws as jest.Mock).mockResolvedValue([
      { id: "solo", status: "active", type: { seats: 1 } },
    ]);
    expect(
      await codeOf(
        submitRideRequest(
          request({ passengerIds: ["mother", "father"] }),
          CARER,
          NOW,
        ),
      ),
    ).toBe("tooManyRiders");
  });

  it("caps riders at the seats of the largest trishaw and the model", () => {
    expect(maxRidersFor([])).toBe(2);
    expect(maxRidersFor([{ type: null }])).toBe(2);
    expect(maxRidersFor([{ type: { seats: 1 } }])).toBe(1);
    expect(maxRidersFor([{ type: { seats: 1 } }, { type: { seats: 4 } }])).toBe(
      2,
    );
  });

  describe("lifecycle 1D", () => {
    it("refuses a window inside the lead time", async () => {
      expect(
        await codeOf(
          submitRideRequest(
            request({
              window: { date: "2026-10-06", startMinute: 600, endMinute: 660 },
            }),
            CARER,
            NOW,
          ),
        ),
      ).toBe("leadTime");
    });

    it("refuses a window beyond the horizon", async () => {
      expect(
        await codeOf(
          submitRideRequest(
            request({
              window: { date: "2026-12-01", startMinute: 600, endMinute: 660 },
            }),
            CARER,
            NOW,
          ),
        ),
      ).toBe("beyondHorizon");
    });

    it("refuses a window outside the riding hours", async () => {
      expect(
        await codeOf(
          submitRideRequest(
            request({
              window: { date: "2026-10-08", startMinute: 840, endMinute: 900 },
            }),
            CARER,
            NOW,
          ),
        ),
      ).toBe("outsideHours");
    });

    it("refuses a day the chapter is closed", async () => {
      (chapters.getOperatingHours as jest.Mock).mockResolvedValue({
        ...MORNINGS,
        closures: ["2026-10-08"],
      });
      expect(await codeOf(submitRideRequest(request(), CARER, NOW))).toBe(
        "closedDate",
      );
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe("automatic scheduling", () => {
    beforeEach(() => {
      (chapters.getSettings as jest.Mock).mockResolvedValue(
        settings({ schedulingMethod: "auto" }),
      );
    });

    it("makes a ride at once when a trishaw is free, unannounced", async () => {
      expect(await submitRideRequest(request(), CARER, NOW)).toEqual({
        id: "request-1",
        rideId: "ride-1",
      });
      expect(submit).toHaveBeenCalledWith(expect.anything(), {
        announce: false,
      });
      expect(rideRequests.claim).toHaveBeenCalledWith("request-1", null);
      expect(scheduleRide).toHaveBeenCalledWith(
        expect.objectContaining({
          chapterId: MUNICH,
          passengerIds: ["mother"],
          startsAt: new Date("2026-10-08T08:00:00Z"),
        }),
        null,
        expect.objectContaining({ requestId: "request-1" }),
      );
      expect(rideRequests.markScheduled).toHaveBeenCalledWith(
        "request-1",
        { id: "ride-1", returnLegId: null },
        null,
      );
      expect(rideRequests.announce).not.toHaveBeenCalled();
    });

    it("re-lists the request when every trishaw is taken", async () => {
      (rides.bookedTrishawIds as jest.Mock).mockResolvedValue(
        new Set(["trishaw-1"]),
      );
      expect(await submitRideRequest(request(), CARER, NOW)).toEqual({
        id: "request-1",
        rideId: null,
      });
      expect(rideRequests.claim).not.toHaveBeenCalled();
      expect(rideRequests.announce).toHaveBeenCalledWith("request-1");
    });

    it("hands the request back when the lock finds the trishaw gone", async () => {
      scheduleRide.mockRejectedValue(new DomainError("noTrishawFree"));
      expect(await submitRideRequest(request(), CARER, NOW)).toEqual({
        id: "request-1",
        rideId: null,
      });
      expect(rideRequests.release).toHaveBeenCalledWith("request-1");
      expect(rideRequests.markScheduled).not.toHaveBeenCalled();
      expect(rideRequests.announce).toHaveBeenCalledWith("request-1");
    });
  });
});
