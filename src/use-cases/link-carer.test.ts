import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { requestCarerLink } from "./link-carer";

jest.mock("@/features/membership", () => ({
  membership: { getMemberRoles: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { getPassenger: jest.fn(), requestCareLink: jest.fn() },
}));

const roles = membership.getMemberRoles as jest.Mock;
const getPassenger = passengers.getPassenger as jest.Mock;
const requestCareLink = passengers.requestCareLink as jest.Mock;

const input = {
  passengerId: "p-erna",
  caretakerUserId: "user-hilde",
  actorUserId: "admin-1",
};

beforeEach(() => {
  jest.clearAllMocks();
  getPassenger.mockResolvedValue({
    id: "p-erna",
    chapterId: "chapter-a",
    userId: "user-erna",
  });
  roles.mockResolvedValue(["passenger"]);
  requestCareLink.mockResolvedValue({ id: "care-1", chapterId: "chapter-a" });
});

describe("requestCarerLink", () => {
  it("asks a member of the rider's own chapter", async () => {
    await expect(requestCarerLink(input)).resolves.toEqual({
      id: "care-1",
      chapterId: "chapter-a",
      riderUserId: "user-erna",
    });

    expect(roles).toHaveBeenCalledWith("user-hilde", "chapter-a");
    expect(requestCareLink).toHaveBeenCalledWith({
      passengerId: "p-erna",
      caretakerUserId: "user-hilde",
      requestedByUserId: "admin-1",
    });
  });

  it("refuses someone who is not in the rider's chapter", async () => {
    roles.mockResolvedValue([]);

    await expect(requestCarerLink(input)).rejects.toMatchObject({
      code: "notChapterMember",
    });
    expect(requestCareLink).not.toHaveBeenCalled();
  });

  it("refuses a rider without an account of their own", async () => {
    getPassenger.mockResolvedValue({
      id: "p-erna",
      chapterId: "chapter-a",
      userId: null,
    });

    await expect(requestCarerLink(input)).rejects.toMatchObject({
      code: "unknownPassenger",
    });
    expect(roles).not.toHaveBeenCalled();
  });
});
