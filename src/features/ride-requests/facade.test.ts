import { rideRequests } from "@/features/ride-requests";
import {
  claimPendingRequest,
  closePendingRequest,
  countOpenRequestsOfRequester,
  countOpenRequestsOverlapping,
  countRideRequests,
  findDestinationsOfRequester,
  findOpenRequestsOf,
  findRideRequests,
  findRideRequestsOfRequester,
  findOpenRequestsOfRequesterWith,
  removeRequestRider,
  setRequester,
  findRideRequestScope,
  insertRideRequest,
  linkRequestToRide,
  releaseClaimedRequest,
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

describe("withdrawOpenRequests", () => {
  const openRequests = findOpenRequestsOf as jest.Mock;
  const now = new Date("2026-10-08T08:00:00Z");

  const open = (id: string, requesterUserId: string, ...riders: string[]) => ({
    id,
    chapterId: MUNICH,
    requesterUserId,
    passengers: riders.map((passengerId) => ({ passengerId })),
  });

  const withdrawn = (requestId: string, actorUserId: string) => ({
    type: "rideRequest.withdrawn",
    requestId,
    chapterId: MUNICH,
    actorUserId,
  });

  it("closes every open request the leaving account sent", async () => {
    openRequests.mockResolvedValue([
      open("request-1", REQUESTER, "mother"),
      open("request-2", REQUESTER, "mother", "karl"),
    ]);

    await expect(
      rideRequests.withdrawOpenRequests(
        { requesterUserId: REQUESTER },
        "admin-1",
        now,
      ),
    ).resolves.toBe(2);

    expect(openRequests).toHaveBeenCalledWith({
      requesterUserId: REQUESTER,
      passengerIds: [],
    });
    for (const id of ["request-1", "request-2"])
      expect(close).toHaveBeenCalledWith(
        id,
        { status: "withdrawn", decidedByUserId: "admin-1", decidedAt: now },
        null,
        {},
      );
    expect(emitted).toEqual([
      withdrawn("request-1", "admin-1"),
      withdrawn("request-2", "admin-1"),
    ]);
  });

  it("closes a request only when all its riders leave", async () => {
    openRequests.mockResolvedValue([
      open("alone", REQUESTER, "greta"),
      open("shared", REQUESTER, "greta", "karl"),
    ]);

    await expect(
      rideRequests.withdrawOpenRequests(
        { passengerIds: ["greta"] },
        "daughter-lena",
        now,
      ),
    ).resolves.toBe(1);

    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith("alone", expect.anything(), null, {});
    expect(emitted).toEqual([withdrawn("alone", "daughter-lena")]);
  });

  it("closes a shared request when every rider on it leaves", async () => {
    openRequests.mockResolvedValue([
      open("shared", REQUESTER, "greta", "karl"),
    ]);

    await rideRequests.withdrawOpenRequests(
      { passengerIds: ["greta", "karl"] },
      "admin-1",
      now,
    );

    expect(emitted).toEqual([withdrawn("shared", "admin-1")]);
  });

  it("emits nothing for a request decided in between", async () => {
    openRequests.mockResolvedValue([
      open("decided", REQUESTER, "mother"),
      open("request-2", REQUESTER, "father"),
    ]);
    close.mockResolvedValueOnce({ count: 0 });

    await rideRequests.withdrawOpenRequests(
      { requesterUserId: REQUESTER },
      "admin-1",
      now,
    );

    expect(close).toHaveBeenCalledTimes(2);
    expect(emitted).toEqual([withdrawn("request-2", "admin-1")]);
  });

  it("returns 0 and queries nothing with neither requester nor riders", async () => {
    await expect(
      rideRequests.withdrawOpenRequests({}, "admin-1"),
    ).resolves.toBe(0);
    await expect(
      rideRequests.withdrawOpenRequests({ passengerIds: [] }, "admin-1"),
    ).resolves.toBe(0);

    expect(openRequests).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });
});

describe("markScheduled", () => {
  const link = linkRequestToRide as jest.Mock;
  const ride = { id: "ride-1", returnLegId: null };

  beforeEach(() => link.mockResolvedValue({ count: 1 }));

  it("links the request to its ride in the transaction that tells the requester", async () => {
    await rideRequests.markScheduled("request-1", ride, "user-admin");

    expect(link).toHaveBeenCalledWith("request-1", "ride-1", {});
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "rideRequest.scheduled",
        requestId: "request-1",
        rideId: "ride-1",
      }),
    ]);
  });

  it("does nothing the second time it is asked to link the same ride", async () => {
    scope
      .mockResolvedValueOnce({ ...pending, status: "scheduled", rideId: null })
      .mockResolvedValueOnce({
        ...pending,
        status: "scheduled",
        rideId: "ride-1",
      });

    await rideRequests.markScheduled("request-1", ride, "user-admin");
    await rideRequests.markScheduled("request-1", ride, null);

    expect(link).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveLength(1);
  });

  it("refuses once the claim no longer holds, and tells nobody", async () => {
    link.mockResolvedValue({ count: 0 });

    expect(
      await codeOf(rideRequests.markScheduled("request-1", ride, "user-admin")),
    ).toBe("requestNotPending");
    expect(emitted).toEqual([]);
  });

  it("lets the second of two links racing for the same ride pass quietly", async () => {
    link.mockResolvedValue({ count: 0 });
    scope
      .mockResolvedValueOnce({ ...pending, status: "scheduled", rideId: null })
      .mockResolvedValueOnce({
        ...pending,
        status: "scheduled",
        rideId: "ride-1",
      });

    await expect(
      rideRequests.markScheduled("request-1", ride, null),
    ).resolves.toBeUndefined();
    expect(emitted).toEqual([]);
  });

  it("reads a request that is gone as a missing one", async () => {
    scope.mockResolvedValue(null);

    expect(
      await codeOf(rideRequests.markScheduled("request-1", ride, "user-admin")),
    ).toBe("unknownRequest");
    expect(link).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });
});

describe("announce", () => {
  it("lists a request automatic scheduling could not place for the chapter", async () => {
    await rideRequests.announce("request-1");

    expect(emitted).toEqual([
      {
        type: "rideRequest.submitted",
        requestId: "request-1",
        chapterId: MUNICH,
        actorUserId: REQUESTER,
      },
    ]);
  });

  it.each([
    [
      "a request that is no longer pending",
      { ...pending, status: "scheduled" },
    ],
    ["a request without a requester", { ...pending, requesterUserId: null }],
    ["a request that is gone", null],
  ])("stays quiet for %s", async (_, request) => {
    scope.mockResolvedValue(request);

    await rideRequests.announce("request-1");

    expect(emitted).toEqual([]);
  });
});

describe("release", () => {
  it("hands a claimed request back to pending", async () => {
    (releaseClaimedRequest as jest.Mock).mockResolvedValue({ count: 1 });

    await expect(rideRequests.release("request-1")).resolves.toEqual({
      count: 1,
    });
    expect(releaseClaimedRequest).toHaveBeenCalledWith("request-1");
  });
});

describe("closed", () => {
  const withdrawn = (
    requesterUserId: string | null,
    decidedByUserId: string | null,
  ) => ({
    status: "withdrawn",
    requesterUserId,
    decidedByUserId,
  });

  it("reads a request the requester took back as withdrawn, not closed", () => {
    expect(rideRequests.closed(withdrawn("user-carer", "user-carer"))).toBe(
      false,
    );
  });

  it("reads one an admin or a deletion ended as closed", () => {
    expect(rideRequests.closed(withdrawn("user-carer", "user-admin"))).toBe(
      true,
    );
    expect(rideRequests.closed(withdrawn(null, null))).toBe(true);
  });

  it("never calls an open or decided request closed", () => {
    expect(
      rideRequests.closed({
        status: "declined",
        requesterUserId: "a",
        decidedByUserId: "b",
      }),
    ).toBe(false);
  });
});

describe("listOfUser", () => {
  it("asks only for waiting requests still ahead and those decided in the last 30 days", async () => {
    const now = new Date("2026-10-16T08:00:00Z");
    (findRideRequestsOfRequester as jest.Mock).mockResolvedValue([]);
    await rideRequests.listOfUser("user-carer", now);
    expect(findRideRequestsOfRequester).toHaveBeenCalledWith(
      "user-carer",
      { since: new Date("2026-09-16T08:00:00Z"), now },
      50,
    );
  });
});

describe("lapsed", () => {
  const now = new Date("2026-10-08T09:00:00Z");
  const asked = (status: string, requestedEndsAt: Date) => ({
    status,
    requestedEndsAt,
  });

  it("reads a pending request as lapsed the moment its window ends", () => {
    expect(rideRequests.lapsed(asked("pending", now), now)).toBe(true);
  });

  it("keeps a pending request open until its window has ended", () => {
    expect(
      rideRequests.lapsed(asked("pending", new Date(now.getTime() + 1)), now),
    ).toBe(false);
  });

  it.each(["scheduled", "declined", "withdrawn"])(
    "never reads a %s request as lapsed, however long its window is past",
    (status) => {
      expect(
        rideRequests.lapsed(
          asked(status, new Date("2026-09-01T09:00:00Z")),
          now,
        ),
      ).toBe(false);
    },
  );
});

describe("listing requests", () => {
  const list = findRideRequests as jest.Mock;
  const count = countRideRequests as jest.Mock;
  const now = new Date("2026-10-08T09:00:00Z");

  beforeEach(() => {
    list.mockResolvedValue([{ id: "request-1" }]);
    count.mockResolvedValue(3);
  });

  it("leaves requests whose window has passed off the open list", async () => {
    await expect(
      rideRequests.listRequests([MUNICH], "pending", now),
    ).resolves.toEqual([{ id: "request-1" }]);
    expect(list).toHaveBeenCalledWith([MUNICH], "pending", 200, now);
  });

  it("lists the open ones when no view is named", async () => {
    await rideRequests.listPending([MUNICH], now);
    expect(list).toHaveBeenCalledWith([MUNICH], "pending", 200, now);
  });

  it.each(["scheduled", "declined", "withdrawn", null] as const)(
    "shows every request of the %s view, its window past or not",
    async (status) => {
      await rideRequests.listRequests([MUNICH], status, now);
      expect(list).toHaveBeenCalledWith([MUNICH], status, 200, null);
    },
  );

  it("reads nothing for an admin without chapters", async () => {
    await expect(
      rideRequests.listRequests([], "pending", now),
    ).resolves.toEqual([]);
    await expect(rideRequests.listPending([], now)).resolves.toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it("counts only the open requests whose window is still ahead", async () => {
    await expect(rideRequests.countPending([MUNICH], now)).resolves.toBe(3);
    expect(count).toHaveBeenCalledWith([MUNICH], "pending", now);
  });

  it("counts nothing for an admin without chapters, without asking", async () => {
    await expect(rideRequests.countPending([], now)).resolves.toBe(0);
    expect(count).not.toHaveBeenCalled();
  });
});
