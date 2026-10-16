import { accounts } from "@/features/accounts";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { domainCode } from "@/lib/domain-error";
import { handOverRider } from "./hand-over-rider";

jest.mock("@/features/accounts", () => ({
  accounts: { findUserIdByContact: jest.fn(), provisionUserStrict: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { getMemberRoles: jest.fn(), joinAsPassenger: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    getPassenger: jest.fn(),
    handOverRider: jest.fn(),
    announceCareInvite: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { markManagesOthers: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { handOverOpenRequests: jest.fn() },
}));

const MUNICH = "chapter-muenchen";
const ADMIN = "user-admin";

const codeOf = (run: Promise<unknown>) =>
  run.then(
    () => null,
    (error) => domainCode(error),
  );

beforeEach(() => {
  jest.clearAllMocks();
  (passengers.getPassenger as jest.Mock).mockResolvedValue({
    id: "erna",
    chapterId: MUNICH,
    managedByUserId: "user-old",
    userId: null,
  });
  (passengers.handOverRider as jest.Mock).mockResolvedValue({
    chapterId: MUNICH,
    fromUserId: "user-old",
  });
  (membership.getMemberRoles as jest.Mock).mockResolvedValue(["passenger"]);
});

describe("handOverRider", () => {
  it("moves the rider to a member of their chapter", async () => {
    const moved = await handOverRider({
      passengerId: "erna",
      target: { kind: "member", userId: "user-daughter" },
      actorUserId: ADMIN,
    });
    expect(membership.getMemberRoles).toHaveBeenCalledWith(
      "user-daughter",
      MUNICH,
    );
    expect(passengers.handOverRider).toHaveBeenCalledWith(
      "erna",
      "user-daughter",
      ADMIN,
      { invited: false },
    );
    expect(profile.markManagesOthers).toHaveBeenCalledWith("user-daughter");
    expect(moved).toMatchObject({ toUserId: "user-daughter", invited: false });
  });

  it("takes the rider's open requests along to the new manager", async () => {
    await handOverRider({
      passengerId: "erna",
      target: { kind: "member", userId: "user-daughter" },
      actorUserId: ADMIN,
    });
    expect(rideRequests.handOverOpenRequests).toHaveBeenCalledWith(
      "erna",
      "user-old",
      "user-daughter",
    );
  });

  it("refuses an account outside the rider's chapter", async () => {
    (membership.getMemberRoles as jest.Mock).mockResolvedValue([]);
    expect(
      await codeOf(
        handOverRider({
          passengerId: "erna",
          target: { kind: "member", userId: "user-stranger" },
          actorUserId: ADMIN,
        }),
      ),
    ).toBe("notChapterMember");
    expect(passengers.handOverRider).not.toHaveBeenCalled();
  });

  it("refuses an existing account outside the chapter even by contact", async () => {
    (accounts.findUserIdByContact as jest.Mock).mockResolvedValue(
      "user-stranger",
    );
    (membership.getMemberRoles as jest.Mock).mockResolvedValue([]);
    expect(
      await codeOf(
        handOverRider({
          passengerId: "erna",
          target: { kind: "invite", name: "Bea", contact: "bea@example.com" },
          actorUserId: ADMIN,
        }),
      ),
    ).toBe("notChapterMember");
    expect(accounts.provisionUserStrict).not.toHaveBeenCalled();
  });

  it("sets up and invites someone new, as a passenger member of the chapter", async () => {
    (accounts.findUserIdByContact as jest.Mock).mockResolvedValue(null);
    (accounts.provisionUserStrict as jest.Mock).mockResolvedValue({
      userId: "user-new",
      created: true,
    });
    const moved = await handOverRider({
      passengerId: "erna",
      target: { kind: "invite", name: "Bea Huber", contact: "bea@example.com" },
      actorUserId: ADMIN,
    });
    expect(accounts.provisionUserStrict).toHaveBeenCalledWith({
      name: "Bea Huber",
      contact: "bea@example.com",
      createdByUserId: ADMIN,
      managesOthers: true,
    });
    expect(membership.joinAsPassenger).toHaveBeenCalledWith(
      "user-new",
      MUNICH,
      ADMIN,
    );
    expect(passengers.handOverRider).toHaveBeenCalledWith(
      "erna",
      "user-new",
      ADMIN,
      { invited: true },
    );
    expect(passengers.announceCareInvite).toHaveBeenCalledWith({
      chapterId: MUNICH,
      userId: "user-new",
      actorUserId: ADMIN,
      passengerId: "erna",
    });
    expect(moved.invited).toBe(true);
  });

  it("sets up nobody and sends no invitation for a member", async () => {
    await handOverRider({
      passengerId: "erna",
      target: { kind: "member", userId: "user-daughter" },
      actorUserId: ADMIN,
    });
    expect(accounts.findUserIdByContact).not.toHaveBeenCalled();
    expect(accounts.provisionUserStrict).not.toHaveBeenCalled();
    expect(membership.joinAsPassenger).not.toHaveBeenCalled();
    expect(passengers.announceCareInvite).not.toHaveBeenCalled();
  });

  it("hands over to a member of the chapter found by contact, without inviting them", async () => {
    (accounts.findUserIdByContact as jest.Mock).mockResolvedValue(
      "user-daughter",
    );
    const moved = await handOverRider({
      passengerId: "erna",
      target: { kind: "invite", name: "Bea", contact: "bea@example.com" },
      actorUserId: ADMIN,
    });
    expect(accounts.findUserIdByContact).toHaveBeenCalledWith(
      "bea@example.com",
    );
    expect(membership.getMemberRoles).toHaveBeenCalledWith(
      "user-daughter",
      MUNICH,
    );
    expect(passengers.handOverRider).toHaveBeenCalledWith(
      "erna",
      "user-daughter",
      ADMIN,
      { invited: false },
    );
    expect(accounts.provisionUserStrict).not.toHaveBeenCalled();
    expect(membership.joinAsPassenger).not.toHaveBeenCalled();
    expect(passengers.announceCareInvite).not.toHaveBeenCalled();
    expect(moved).toMatchObject({ toUserId: "user-daughter", invited: false });
  });

  it("leaves a rider with an account of their own alone", async () => {
    (passengers.getPassenger as jest.Mock).mockResolvedValue({
      id: "lena",
      chapterId: MUNICH,
      managedByUserId: "user-old",
      userId: "user-lena",
    });
    expect(
      await codeOf(
        handOverRider({
          passengerId: "lena",
          target: { kind: "member", userId: "user-daughter" },
          actorUserId: ADMIN,
        }),
      ),
    ).toBe("unknownPassenger");
  });
});
