import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import type { Access } from "@/lib/access";
import { accessPerson } from "./person-access";
import { removeManagedRider, updateManagedRider } from "./manage-rider";

jest.mock("./person-access", () => ({
  ...jest.requireActual("./person-access"),
  accessPerson: jest.fn(),
}));
jest.mock("@/features/passengers", () => ({
  passengers: { updateManagedRider: jest.fn(), removeManagedRider: jest.fn() },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { listPhotoFilesOf: jest.fn(), purgePhotoFiles: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { cancelUpcomingBookings: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { withdrawOpenRequests: jest.fn() },
}));
jest.mock("@/lib/observability/logger", () => ({ logDomainEvent: jest.fn() }));

const access = accessPerson as jest.Mock;
const update = passengers.updateManagedRider as jest.Mock;
const remove = passengers.removeManagedRider as jest.Mock;
const listPhotos = personProfiles.listPhotoFilesOf as jest.Mock;
const purge = personProfiles.purgePhotoFiles as jest.Mock;
const cancelBookings = rides.cancelUpcomingBookings as jest.Mock;
const withdrawRequests = rideRequests.withdrawOpenRequests as jest.Mock;

const CHAPTER = "chapter-muenchen";
const viewer = {
  user: { id: "daughter-lena" },
  access: { role: null, countryAdminOf: [], memberships: [] } as Access,
};

const target = (overrides: object = {}) => ({
  subject: { kind: "passenger", id: "managed-greta" },
  managedAccount: true,
  riderChapter: { id: CHAPTER, countryId: "country-de" },
  ...overrides,
});

const order: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  order.length = 0;
  access.mockResolvedValue({ relation: "manager", target: target() });
  listPhotos.mockResolvedValue([{ id: "file-1", key: "files/1.webp" }]);
  cancelBookings.mockImplementation(async () => {
    order.push("cancel");
  });
  remove.mockImplementation(async () => {
    order.push("remove");
  });
  purge.mockImplementation(async () => {
    order.push("purge");
  });
});

describe("updateManagedRider", () => {
  it("lets the manager change the rider's details", async () => {
    await expect(
      updateManagedRider({
        viewer,
        passengerId: "managed-greta",
        patch: { firstName: "Margarete" },
      }),
    ).resolves.toEqual({ chapterId: CHAPTER });

    expect(access).toHaveBeenCalledWith(viewer, {
      kind: "passenger",
      id: "managed-greta",
    });
    expect(update).toHaveBeenCalledWith("managed-greta", {
      firstName: "Margarete",
    });
  });

  it.each([
    ["someone who cannot see the rider", null],
    ["a pilot of the chapter", { relation: "peer", target: target() }],
    [
      "a rider who has their own account",
      {
        relation: "manager",
        target: target({ subject: { kind: "user", id: "resident-otto" } }),
      },
    ],
  ])("refuses %s", async (_, found) => {
    access.mockResolvedValue(found);

    await expect(
      updateManagedRider({
        viewer,
        passengerId: "managed-greta",
        patch: { firstName: "Margarete" },
      }),
    ).rejects.toMatchObject({ code: "unknownPassenger" });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("removeManagedRider", () => {
  it("deletes the rider, then purges their profile photo", async () => {
    access.mockResolvedValue({ relation: "admin", target: target() });

    await removeManagedRider({ viewer, passengerId: "managed-greta" });

    expect(listPhotos).toHaveBeenCalledWith({
      userIds: [],
      passengerIds: ["managed-greta"],
    });
    expect(remove).toHaveBeenCalledWith("managed-greta");
    expect(purge).toHaveBeenCalledWith([{ id: "file-1", key: "files/1.webp" }]);
    expect(order).toEqual(["cancel", "remove", "purge"]);
  });

  it("gives up the rider's seats still ahead, as the one removing them", async () => {
    access.mockResolvedValue({ relation: "manager", target: target() });

    await removeManagedRider({ viewer, passengerId: "managed-greta" });

    expect(cancelBookings).toHaveBeenCalledWith(
      ["managed-greta"],
      "daughter-lena",
    );
  });

  it("withdraws the removed rider's open requests before the rider goes", async () => {
    await removeManagedRider({ viewer, passengerId: "managed-greta" });

    expect(withdrawRequests).toHaveBeenCalledWith(
      { passengerIds: ["managed-greta"] },
      "daughter-lena",
    );
    expect(withdrawRequests.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    );
  });

  it("refuses an admin of another chapter", async () => {
    access.mockResolvedValue(null);

    await expect(
      removeManagedRider({ viewer, passengerId: "managed-greta" }),
    ).rejects.toMatchObject({ code: "unknownPassenger" });
    expect(remove).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
    expect(cancelBookings).not.toHaveBeenCalled();
    expect(withdrawRequests).not.toHaveBeenCalled();
  });
});
