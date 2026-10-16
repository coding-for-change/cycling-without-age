import { revalidatePath } from "next/cache";
import {
  declineRideRequestAction,
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
import { scheduleFromRequest } from "@/use-cases/schedule-from-request";
import { submitRideRequest } from "@/use-cases/submit-ride-request";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(),
  requireAuth: jest.fn(),
  requireChapterAdmin: jest.fn(),
}));
jest.mock("@/use-cases/schedule-from-request", () => ({
  scheduleFromRequest: jest.fn(),
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
