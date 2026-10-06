import { accounts } from "@/features/accounts";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";

jest.mock("@/features/accounts", () => ({
  accounts: { findUserIdByContact: jest.fn(), provisionUserStrict: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listMembershipsOfUser: jest.fn(), joinAsPassenger: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    addPassenger: jest.fn(),
    requestCare: jest.fn(),
    announceCareInvite: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { markManagesOthers: jest.fn(), setResidence: jest.fn() },
}));
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));

const findByContact = accounts.findUserIdByContact as jest.Mock;
const provision = accounts.provisionUserStrict as jest.Mock;
const join = membership.joinAsPassenger as jest.Mock;
const addPassenger = passengers.addPassenger as jest.Mock;
const requestCare = passengers.requestCare as jest.Mock;
const announce = passengers.announceCareInvite as jest.Mock;
const setResidence = profile.setResidence as jest.Mock;
const record = activity.record as jest.Mock;

const CHAPTER = "chapter-muenchen";
const rider = {
  firstName: "Inge",
  lastName: "Holm",
  birthDate: new Date("1939-07-30"),
  gender: "female" as const,
};
const home = {
  residence: "home" as const,
  address: "Leopoldstraße 1, München",
  latitude: 48.15,
  longitude: 11.58,
};
const helper = {
  name: "Hilde Holm",
  relationship: "child",
  contact: "hilde@example.com",
};

beforeEach(() => {
  jest.clearAllMocks();
  findByContact.mockResolvedValue(null);
  provision.mockResolvedValue({ userId: "user-new", created: true });
  addPassenger.mockResolvedValue({ id: "passenger-new" });
});

describe("provisionAssistedPassenger", () => {
  it("creates the helper's account and keeps the pickup on the managed rider", async () => {
    await expect(
      provisionAssistedPassenger({
        adminUserId: "admin-1",
        input: {
          chapterId: CHAPTER,
          ...rider,
          contact: helper.contact,
          helper,
          pickup: home,
        },
      }),
    ).resolves.toEqual({ userId: "user-new", outcome: "sent" });

    expect(join).toHaveBeenCalledWith("user-new", CHAPTER, "admin-1");
    expect(addPassenger).toHaveBeenCalledWith({
      chapterId: CHAPTER,
      managedByUserId: "user-new",
      userId: null,
      ...rider,
      pickup: home,
    });
    expect(setResidence).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith({
      chapterId: CHAPTER,
      userId: "user-new",
      actorUserId: "admin-1",
      passengerId: "passenger-new",
    });
  });

  it("gives the account to the helper when the rider has no contact of their own", async () => {
    await provisionAssistedPassenger({
      adminUserId: "admin-1",
      input: { chapterId: CHAPTER, ...rider, helper },
    });

    expect(provision).toHaveBeenCalledWith(
      expect.objectContaining({
        name: helper.name,
        contact: helper.contact,
        managesOthers: true,
      }),
    );
    expect(addPassenger).toHaveBeenCalledWith(
      expect.objectContaining({ managedByUserId: "user-new", userId: null }),
    );
  });

  it("stores the pickup on the account when the rider owns it", async () => {
    await provisionAssistedPassenger({
      adminUserId: "admin-1",
      input: {
        chapterId: CHAPTER,
        ...rider,
        contact: "inge@example.com",
        pickup: { residence: "careHome" },
      },
    });

    expect(setResidence).toHaveBeenCalledWith("user-new", "careHome");
    expect(addPassenger).toHaveBeenCalledWith(
      expect.not.objectContaining({ pickup: expect.anything() }),
    );
  });

  it("asks a helper who already has an account instead of adding the rider", async () => {
    findByContact.mockResolvedValue("user-hilde");

    await expect(
      provisionAssistedPassenger({
        adminUserId: "admin-1",
        input: { chapterId: CHAPTER, ...rider, helper, pickup: home },
      }),
    ).resolves.toEqual({ userId: "user-hilde", outcome: "sent" });

    expect(requestCare).toHaveBeenCalledWith({
      chapterId: CHAPTER,
      caretakerUserId: "user-hilde",
      requestedByUserId: "admin-1",
      rider: { ...rider, pickup: home },
      relationship: helper.relationship,
      helperName: helper.name,
    });
    expect(provision).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
    expect(addPassenger).not.toHaveBeenCalled();
  });

  it("still refuses a rider's own contact that already has an account", async () => {
    provision.mockRejectedValue(new DomainError("alreadyHasAccount"));

    await expect(
      provisionAssistedPassenger({
        adminUserId: "admin-1",
        input: { chapterId: CHAPTER, ...rider, contact: "inge@example.com" },
      }),
    ).rejects.toMatchObject({ code: "alreadyHasAccount" });
    expect(findByContact).not.toHaveBeenCalled();
  });
});
