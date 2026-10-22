import { revalidatePath } from "next/cache";
import {
  changeRideRequestAction,
  declineRideRequestAction,
  previewRequestRouteAction,
  scheduleRideRequestAction,
  submitRideRequestAction,
  withdrawRideRequestAction,
} from "@/features/ride-requests/actions";
import { rideRequests } from "@/features/ride-requests/index";
import { rideRequestInput } from "@/features/ride-requests/schemas";
import {
  requireAdminScope,
  requireAuth,
  requireChapterAdmin,
} from "@/lib/auth-guards";
import { DomainError } from "@/lib/domain-error";
import { cyclingRoute } from "@/lib/mapbox";
import { changeRideRequest } from "@/use-cases/change-ride-request";
import { scheduleFromRequest } from "@/use-cases/schedule-from-request";
import { submitRideRequest } from "@/use-cases/submit-ride-request";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(),
  requireAuth: jest.fn(),
  requireChapterAdmin: jest.fn(),
}));
jest.mock("@/lib/mapbox", () => ({ cyclingRoute: jest.fn() }));
jest.mock("@/use-cases/schedule-from-request", () => ({
  scheduleFromRequest: jest.fn(),
}));
jest.mock("@/use-cases/change-ride-request", () => ({
  changeRideRequest: jest.fn(),
}));
jest.mock("@/use-cases/submit-ride-request", () => ({
  submitRideRequest: jest.fn(),
}));
jest.mock("@/features/ride-requests/index", () => ({
  rideRequests: {
    getRequest: jest.fn(),
    decline: jest.fn(),
    withdraw: jest.fn(),
  },
}));

const adminScope = requireAdminScope as jest.Mock;
const chapterAdmin = requireChapterAdmin as jest.Mock;
const signedIn = requireAuth as jest.Mock;
const getRequest = rideRequests.getRequest as jest.Mock;
const decline = rideRequests.decline as jest.Mock;
const withdraw = rideRequests.withdraw as jest.Mock;
const schedule = scheduleFromRequest as jest.Mock;
const submit = submitRideRequest as jest.Mock;

const MUNICH = "chapter-muenchen";
const HAMBURG = "chapter-hh";
const ADMIN = "user-admin";
const REQUESTER = "user-carer";

const riders = (...ids: string[]) => ids.map((id) => ({ passenger: { id } }));

const request = (overrides: object = {}) => ({
  id: "request-1",
  chapterId: MUNICH,
  passengers: riders("mother", "father"),
  ...overrides,
});

const form = (overrides: object = {}) => ({
  model: "pleasure",
  slot: { date: "2026-10-08", start: "10:00", durationMinutes: 60 },
  trishawIds: ["trishaw-1"],
  passengerIds: ["mother", "father"],
  ...overrides,
});

const ask = (overrides: object = {}) => ({
  passengerIds: ["mother"],
  model: "pleasure",
  pickup: { name: "Home", address: null, latitude: null, longitude: null },
  window: { date: "2026-10-08", startMinute: 600, endMinute: 660 },
  ...overrides,
});

const nothingDecided = () => {
  expect(decline).not.toHaveBeenCalled();
  expect(schedule).not.toHaveBeenCalled();
};

const decisions = [
  [
    "decline",
    () => declineRideRequestAction({ requestId: "request-1", note: null }),
  ],
  ["schedule", () => scheduleRideRequestAction("request-1", form())],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  adminScope.mockResolvedValue({
    scope: { chapters: [{ id: MUNICH }, { id: HAMBURG }] },
  });
  chapterAdmin.mockResolvedValue({ user: { id: ADMIN } });
  signedIn.mockResolvedValue({ user: { id: REQUESTER } });
  getRequest.mockResolvedValue(request());
  decline.mockResolvedValue(undefined);
  withdraw.mockResolvedValue(undefined);
  schedule.mockResolvedValue({ id: "ride-1" });
  submit.mockResolvedValue({ id: "request-1", rideId: null });
});

describe("scheduleRideRequestAction", () => {
  it("schedules into the request's chapter whatever the form says", async () => {
    await expect(
      scheduleRideRequestAction("request-1", form({ chapterId: HAMBURG })),
    ).resolves.toEqual({ ok: true, id: "ride-1" });

    expect(chapterAdmin).toHaveBeenCalledWith(MUNICH);
    expect(chapterAdmin).not.toHaveBeenCalledWith(HAMBURG);
    expect(schedule).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({ chapterId: MUNICH }),
      ADMIN,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("keeps a request rider the form dropped", async () => {
    await scheduleRideRequestAction(
      "request-1",
      form({ passengerIds: ["mother"] }),
    );

    expect(schedule).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({ passengerIds: ["mother", "father"] }),
      ADMIN,
    );
  });

  it("keeps the riders the admin added in the drawer", async () => {
    getRequest.mockResolvedValue(request({ passengers: riders("mother") }));

    await scheduleRideRequestAction(
      "request-1",
      form({ passengerIds: ["aunt"] }),
    );

    expect(schedule).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({ passengerIds: ["mother", "aunt"] }),
      ADMIN,
    );
  });

  it("answers destinationRequired for a functional ride without a destination", async () => {
    await expect(
      scheduleRideRequestAction("request-1", form({ model: "functional" })),
    ).resolves.toEqual({ ok: false, error: "destinationRequired" });
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe.each(decisions)("%s a request", (_, decide) => {
  it("turns away someone with no admin scope before reading the request", async () => {
    adminScope.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(decide()).rejects.toThrow("NEXT_REDIRECT");
    expect(getRequest).not.toHaveBeenCalled();
    expect(chapterAdmin).not.toHaveBeenCalled();
    nothingDecided();
  });

  it("answers unknownRequest for a request that does not exist", async () => {
    getRequest.mockResolvedValue(null);

    await expect(decide()).resolves.toEqual({
      ok: false,
      error: "unknownRequest",
    });
    expect(chapterAdmin).not.toHaveBeenCalled();
    nothingDecided();
  });

  it("answers unknownRequest for a request outside the admin's chapters", async () => {
    adminScope.mockResolvedValue({ scope: { chapters: [{ id: HAMBURG }] } });

    await expect(decide()).resolves.toEqual({
      ok: false,
      error: "unknownRequest",
    });
    expect(chapterAdmin).not.toHaveBeenCalled();
    nothingDecided();
  });

  it("refuses an admin of another chapter", async () => {
    chapterAdmin.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;403"));

    await expect(decide()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    expect(chapterAdmin).toHaveBeenCalledWith(MUNICH);
    nothingDecided();
  });
});

describe("declineRideRequestAction", () => {
  it("declines as the chapter admin, with the note", async () => {
    await expect(
      declineRideRequestAction({
        requestId: "request-1",
        note: "No pilots that week",
      }),
    ).resolves.toEqual({ ok: true });

    expect(decline).toHaveBeenCalledWith(
      "request-1",
      ADMIN,
      "No pilots that week",
    );
  });
});

describe("withdrawRideRequestAction", () => {
  it("withdraws as the signed-in account", async () => {
    await expect(withdrawRideRequestAction("request-1")).resolves.toEqual({
      ok: true,
    });

    expect(withdraw).toHaveBeenCalledWith("request-1", REQUESTER);
  });

  it("passes on the facade's refusal", async () => {
    withdraw.mockRejectedValue(new DomainError("unknownRequest"));

    await expect(withdrawRideRequestAction("request-1")).resolves.toEqual({
      ok: false,
      error: "unknownRequest",
    });
  });

  it("answers rateLimited past thirty withdrawals an hour", async () => {
    signedIn.mockResolvedValue({ user: { id: "user-withdraws-a-lot" } });

    for (let i = 0; i < 30; i++)
      await expect(withdrawRideRequestAction(`request-${i}`)).resolves.toEqual({
        ok: true,
      });

    await expect(withdrawRideRequestAction("request-30")).resolves.toEqual({
      ok: false,
      error: "rateLimited",
    });
    expect(withdraw).toHaveBeenCalledTimes(30);
  });
});

describe("submitRideRequestAction", () => {
  it("submits for the signed-in account", async () => {
    await expect(submitRideRequestAction(ask())).resolves.toEqual({
      ok: true,
      id: "request-1",
      rideId: null,
    });

    expect(submit).toHaveBeenCalledWith(
      rideRequestInput.parse(ask()),
      REQUESTER,
    );
  });

  it("answers generic to input that does not parse, before asking who is signed in", async () => {
    await expect(
      submitRideRequestAction(ask({ passengerIds: [] })),
    ).resolves.toEqual({ ok: false, error: "generic" });

    expect(signedIn).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("turns down a functional request without a destination", async () => {
    await expect(
      submitRideRequestAction(ask({ model: "functional" })),
    ).resolves.toEqual({ ok: false, error: "generic" });

    expect(submit).not.toHaveBeenCalled();
  });

  it("answers rateLimited past ten requests an hour", async () => {
    signedIn.mockResolvedValue({ user: { id: "user-asks-a-lot" } });

    for (let i = 0; i < 10; i++)
      await expect(submitRideRequestAction(ask())).resolves.toMatchObject({
        ok: true,
      });

    await expect(submitRideRequestAction(ask())).resolves.toEqual({
      ok: false,
      error: "rateLimited",
    });
    expect(submit).toHaveBeenCalledTimes(10);
  });
});

describe("previewRequestRouteAction", () => {
  const route = cyclingRoute as jest.Mock;
  const MARIENPLATZ = { lat: 48.1374, lng: 11.5755 };
  const ENGLISCHER_GARTEN = { lat: 48.1642, lng: 11.6056 };
  const BERLIN = { lat: 52.52, lng: 13.405 };

  beforeEach(() => {
    route.mockResolvedValue({
      path: [
        [11.5755, 48.1374],
        [11.6056, 48.1642],
      ],
      durationSec: 900,
      distanceM: 4200,
      legs: ["internal"],
    });
  });

  it("returns only the path, distance and duration of the cycling route", async () => {
    signedIn.mockResolvedValue({ user: { id: "route-reader" } });

    await expect(
      previewRequestRouteAction({
        from: MARIENPLATZ,
        to: ENGLISCHER_GARTEN,
        token: "leak",
      }),
    ).resolves.toEqual({
      path: [
        [11.5755, 48.1374],
        [11.6056, 48.1642],
      ],
      durationSec: 1350,
      distanceM: 4200,
    });
    expect(route).toHaveBeenCalledWith(MARIENPLATZ, ENGLISCHER_GARTEN);
  });

  it("asks who is signed in before anything else", async () => {
    signedIn.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      previewRequestRouteAction({ from: MARIENPLATZ, to: ENGLISCHER_GARTEN }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(route).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing point", { from: MARIENPLATZ }],
    [
      "a latitude past the pole",
      { from: { lat: 91, lng: 0 }, to: MARIENPLATZ },
    ],
    [
      "a longitude off the globe",
      { from: MARIENPLATZ, to: { lat: 0, lng: 181 } },
    ],
    ["text for a number", { from: { lat: "48", lng: "11" }, to: MARIENPLATZ }],
    [
      "two points further apart than a trishaw rides",
      { from: MARIENPLATZ, to: BERLIN },
    ],
    ["no object at all", "Marienplatz"],
  ])("answers null to %s without asking Mapbox", async (_, input) => {
    await expect(previewRequestRouteAction(input)).resolves.toBeNull();
    expect(route).not.toHaveBeenCalled();
  });

  it("stops asking Mapbox past thirty previews a minute", async () => {
    signedIn.mockResolvedValue({ user: { id: "route-spammer" } });
    for (let call = 0; call < 30; call++)
      await previewRequestRouteAction({
        from: MARIENPLATZ,
        to: ENGLISCHER_GARTEN,
      });

    await expect(
      previewRequestRouteAction({ from: MARIENPLATZ, to: ENGLISCHER_GARTEN }),
    ).resolves.toBeNull();
    expect(route).toHaveBeenCalledTimes(30);
  });

  it("answers null when Mapbox has no route", async () => {
    signedIn.mockResolvedValue({ user: { id: "route-nowhere" } });
    route.mockResolvedValue(null);

    await expect(
      previewRequestRouteAction({ from: MARIENPLATZ, to: ENGLISCHER_GARTEN }),
    ).resolves.toBeNull();
  });
});

describe("changeRideRequestAction", () => {
  const change = changeRideRequest as jest.Mock;

  beforeEach(() => {
    change.mockResolvedValue({
      id: "request-2",
      rideId: null,
      oldRequestKept: false,
    });
  });

  it("changes the request as the signed-in account, never one the client names", async () => {
    await expect(
      changeRideRequestAction({
        fromRequestId: "request-1",
        request: ask(),
        userId: "user-stranger",
      }),
    ).resolves.toEqual({
      ok: true,
      id: "request-2",
      rideId: null,
      oldRequestKept: false,
    });
    expect(change).toHaveBeenCalledWith(
      "request-1",
      expect.objectContaining({ passengerIds: ["mother"] }),
      REQUESTER,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/passenger", "layout");
  });

  it("turns away malformed input before asking who is signed in", async () => {
    await expect(
      changeRideRequestAction({ fromRequestId: "", request: ask() }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(signedIn).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it("reads someone else's request as a missing one", async () => {
    change.mockRejectedValue(new DomainError("unknownRequest"));
    await expect(
      changeRideRequestAction({ fromRequestId: "request-1", request: ask() }),
    ).resolves.toEqual({ ok: false, error: "unknownRequest" });
  });
});
