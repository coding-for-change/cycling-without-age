import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { DomainError } from "@/lib/domain-error";
import {
  acceptCareRequest,
  declineCareRequest,
} from "@/use-cases/respond-care-request";

jest.mock("@/features/membership", () => ({
  membership: { listMembershipsOfUser: jest.fn(), joinAsPassenger: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    acceptCareRequest: jest.fn(),
    declineCareRequest: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: {
    markManagesOthers: jest.fn(),
    suggestHelperRelationship: jest.fn(),
  },
}));

const accept = passengers.acceptCareRequest as jest.Mock;
const decline = passengers.declineCareRequest as jest.Mock;
const listMemberships = membership.listMembershipsOfUser as jest.Mock;
const join = membership.joinAsPassenger as jest.Mock;
const markManagesOthers = profile.markManagesOthers as jest.Mock;
const suggestRelationship = profile.suggestHelperRelationship as jest.Mock;

const CHAPTER = "chapter-muenchen";
const HILDE = "user-hilde";

beforeEach(() => {
  jest.clearAllMocks();
  accept.mockResolvedValue({
    passengerId: "p-1",
    relationship: "child",
    chapterId: CHAPTER,
  });
  listMemberships.mockResolvedValue([]);
});

describe("acceptCareRequest", () => {
  it("adds the rider, joins the chapter and marks the account as a caretaker", async () => {
    await acceptCareRequest({ userId: HILDE, requestId: "care-1" });

    expect(accept).toHaveBeenCalledWith("care-1", HILDE);
    expect(join).toHaveBeenCalledWith(HILDE, CHAPTER);
    expect(markManagesOthers).toHaveBeenCalledWith(HILDE);
    expect(suggestRelationship).toHaveBeenCalledWith(HILDE, "child");
  });

  it("does not join again when they already ride with the chapter", async () => {
    listMemberships.mockResolvedValue([
      { chapterId: CHAPTER, roles: ["passenger"] },
    ]);

    await acceptCareRequest({ userId: HILDE, requestId: "care-1" });

    expect(join).not.toHaveBeenCalled();
  });

  it("joins nobody when the request was not sent to them", async () => {
    accept.mockRejectedValue(new DomainError("notFound"));

    await expect(
      acceptCareRequest({ userId: "user-stranger", requestId: "care-1" }),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(join).not.toHaveBeenCalled();
    expect(markManagesOthers).not.toHaveBeenCalled();
  });

  it("joins nobody when the rider could not be added", async () => {
    accept.mockRejectedValue(new Error("passengerChapterMismatch"));

    await expect(
      acceptCareRequest({ userId: HILDE, requestId: "care-1" }),
    ).rejects.toThrow();
    expect(join).not.toHaveBeenCalled();
  });
});

describe("declineCareRequest", () => {
  it("closes the request for the person it was sent to", async () => {
    await declineCareRequest({ userId: HILDE, requestId: "care-1" });

    expect(decline).toHaveBeenCalledWith("care-1", HILDE);
  });
});
