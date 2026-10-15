import { rideRequests } from "@/features/ride-requests";
import {
  claimPendingRequest,
  closePendingRequest,
  countOpenRequestsOfRequester,
  countOpenRequestsOverlapping,
  findDestinationsOfRequester,
  findOpenRequestsOfRequesterWith,
  removeRequestRider,
  setRequester,
  findRideRequestScope,
  insertRideRequest,
  linkRequestToRide,
} from "@/features/ride-requests/services/ride-requests";
import { domainCode } from "@/lib/domain-error";

jest.mock("@/features/ride-requests/services/ride-requests", () => ({
  claimPendingRequest: jest.fn(),
  closePendingRequest: jest.fn(),
  countRideRequests: jest.fn(),
  countOpenRequestsOfRequester: jest.fn(),
  countOpenRequestsOverlapping: jest.fn(),
  findDestinationsOfRequester: jest.fn(),
  findOpenRequestsOf: jest.fn(),
  findOpenRequestsOfRequesterWith: jest.fn(),
  removeRequestRider: jest.fn(),
  setRequester: jest.fn(),
  findRideRequest: jest.fn(),
  findRideRequestScope: jest.fn(),
  findRideRequests: jest.fn(),
  findRideRequestsOfRequester: jest.fn(),
  insertRideRequest: jest.fn(),
  linkRequestToRide: jest.fn(),
  releaseClaimedRequest: jest.fn(),
}));

const emitted: unknown[] = [];
jest.mock("@/lib/events", () => ({
  transaction: (
    fn: (tx: object, emit: (event: unknown) => Promise<void>) => unknown,
  ) =>
    fn({}, async (event) => {
      emitted.push(event);
    }),
}));

const scope = findRideRequestScope as jest.Mock;
const close = closePendingRequest as jest.Mock;

const REQUESTER = "user-carer";
const MUNICH = "chapter-muenchen";

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

const pending = {
  id: "request-1",
  chapterId: MUNICH,
  status: "pending",
  requesterUserId: REQUESTER,
};

beforeEach(() => {
  jest.clearAllMocks();
  emitted.length = 0;
  scope.mockResolvedValue(pending);
  close.mockResolvedValue({ count: 1 });
});

describe("withdraw", () => {
  it("lets the requester take a pending request back, and says so", async () => {
    await rideRequests.withdraw("request-1", REQUESTER);
    expect(close).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({ status: "withdrawn" }),
      REQUESTER,
      {},
    );
    expect(emitted).toEqual([
      {
        type: "rideRequest.withdrawn",
        requestId: "request-1",
        chapterId: MUNICH,
        actorUserId: REQUESTER,
      },
    ]);
  });

  it("reads someone else's request as a missing one", async () => {
    expect(
      await codeOf(rideRequests.withdraw("request-1", "user-stranger")),
    ).toBe("unknownRequest");
    expect(close).not.toHaveBeenCalled();
  });

  it("refuses once the chapter has decided", async () => {
    scope.mockResolvedValue({ ...pending, status: "scheduled" });
    expect(await codeOf(rideRequests.withdraw("request-1", REQUESTER))).toBe(
      "requestNotPending",
    );
    expect(close).not.toHaveBeenCalled();
  });

  it("refuses when an admin decided between the read and the write", async () => {
    close.mockResolvedValue({ count: 0 });
    expect(await codeOf(rideRequests.withdraw("request-1", REQUESTER))).toBe(
      "requestNotPending",
    );
    expect(emitted).toEqual([]);
  });
});

describe("decline", () => {
  it("closes a pending request with the note and tells the requester", async () => {
    await rideRequests.decline(
      "request-1",
      "user-admin",
      "No pilots that week",
    );
    expect(close).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({
        status: "declined",
        decidedByUserId: "user-admin",
        decisionNote: "No pilots that week",
      }),
      null,
      {},
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "rideRequest.declined",
        requesterUserId: REQUESTER,
      }),
    ]);
  });

  it("refuses a request that is no longer pending", async () => {
    close.mockResolvedValue({ count: 0 });
    expect(
      await codeOf(rideRequests.decline("request-1", "user-admin", null)),
    ).toBe("requestNotPending");
  });
});

describe("scheduling a request", () => {
  it("claims only a pending request", async () => {
    (claimPendingRequest as jest.Mock).mockResolvedValue({ count: 0 });
    expect(await codeOf(rideRequests.claim("request-1", "user-admin"))).toBe(
      "requestNotPending",
    );
  });

  it("links a ride once, however often it is asked to", async () => {
    scope.mockResolvedValue({
      ...pending,
      status: "scheduled",
      rideId: "ride-1",
    });
    await rideRequests.markScheduled(
      "request-1",
      { id: "ride-1", returnLegId: null },
      null,
    );
    expect(linkRequestToRide).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("links the ride and tells the requester about both legs", async () => {
    (linkRequestToRide as jest.Mock).mockResolvedValue({ count: 1 });
    await rideRequests.markScheduled(
      "request-1",
      { id: "ride-1", returnLegId: "ride-2" },
      "user-admin",
    );
    expect(emitted).toEqual([
      {
        type: "rideRequest.scheduled",
        requestId: "request-1",
        chapterId: MUNICH,
        actorUserId: "user-admin",
        requesterUserId: REQUESTER,
        rideId: "ride-1",
        returnLegId: "ride-2",
      },
    ]);
  });
});

describe("submit", () => {
  const request = {
    chapterId: MUNICH,
    requesterUserId: REQUESTER,
    model: "pleasure" as const,
    passengerIds: ["mother"],
    rideLocationId: null,
    pickupName: "Home",
    pickupAddress: null,
    pickupLatitude: null,
    pickupLongitude: null,
    destinationName: null,
    destinationAddress: null,
    destinationLatitude: null,
    destinationLongitude: null,
    roundTrip: false,
    requestedStartsAt: new Date("2026-10-08T08:00:00Z"),
    requestedEndsAt: new Date("2026-10-08T09:00:00Z"),
    note: null,
  };

  beforeEach(() =>
    (insertRideRequest as jest.Mock).mockResolvedValue({
      id: "request-1",
      chapterId: MUNICH,
    }),
  );

  it("announces a new request to the chapter", async () => {
    await rideRequests.submit(request);
    expect(insertRideRequest).toHaveBeenCalledWith(
      expect.not.objectContaining({ passengerIds: expect.anything() }),
      ["mother"],
      {},
    );
    expect(emitted).toEqual([
      expect.objectContaining({ type: "rideRequest.submitted" }),
    ]);
  });

  it("stays quiet while automatic scheduling still has a go", async () => {
    await rideRequests.submit(request, { announce: false });
    expect(emitted).toEqual([]);
  });
});

it("suggests each earlier destination once, newest first", async () => {
  (findDestinationsOfRequester as jest.Mock).mockResolvedValue([
    { destinationName: "Dr. Weber", destinationAddress: "Hauptstr. 1" },
    { destinationName: "Dr. Weber", destinationAddress: "Hauptstr. 1" },
    { destinationName: "Café Luitpold", destinationAddress: null },
  ]);
  expect(
    (await rideRequests.previousDestinations(REQUESTER)).map(
      (place) => place.name,
    ),
  ).toEqual(["Dr. Weber", "Café Luitpold"]);
});

describe("handOverOpenRequests", () => {
  it("gives a request for this rider alone to the new manager, and takes the rider out of a shared one", async () => {
    (findOpenRequestsOfRequesterWith as jest.Mock).mockResolvedValue([
      { id: "alone", passengers: [{ passengerId: "erna" }] },
      {
        id: "shared",
        passengers: [{ passengerId: "erna" }, { passengerId: "karl" }],
      },
    ]);
    await rideRequests.handOverOpenRequests("erna", "user-old", "user-new");
    expect(findOpenRequestsOfRequesterWith).toHaveBeenCalledWith(
      "user-old",
      "erna",
    );
    expect(setRequester).toHaveBeenCalledWith("alone", "user-new");
    expect(removeRequestRider).toHaveBeenCalledWith("shared", "erna");
    expect(setRequester).toHaveBeenCalledTimes(1);
  });
});

describe("assertCanAsk", () => {
  const window = {
    startsAt: new Date("2026-10-08T08:00:00Z"),
    endsAt: new Date("2026-10-08T09:00:00Z"),
  };

  beforeEach(() => {
    (countOpenRequestsOverlapping as jest.Mock).mockResolvedValue(0);
    (countOpenRequestsOfRequester as jest.Mock).mockResolvedValue(0);
  });

  it("lets a first request through", async () => {
    await expect(
      rideRequests.assertCanAsk(REQUESTER, ["mother"], window),
    ).resolves.toBeUndefined();
  });

  it("refuses a rider already asked for in an overlapping window", async () => {
    (countOpenRequestsOverlapping as jest.Mock).mockResolvedValue(1);
    expect(
      await codeOf(rideRequests.assertCanAsk(REQUESTER, ["mother"], window)),
    ).toBe("alreadyRequested");
  });

  it("caps how many requests one account has waiting", async () => {
    (countOpenRequestsOfRequester as jest.Mock).mockResolvedValue(
      rideRequests.OPEN_REQUESTS_MAX,
    );
    expect(
      await codeOf(rideRequests.assertCanAsk(REQUESTER, ["mother"], window)),
    ).toBe("tooManyRequests");
  });
});
