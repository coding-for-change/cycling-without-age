import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { rides } from "@/features/rides";
import { deleteAccount } from "./delete-account";

jest.mock("@/features/accounts", () => ({
  accounts: { deleteUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    handRidersToTheirOwnAccounts: jest.fn(),
    removeOwnPassenger: jest.fn(),
    listPassengersManagedBy: jest.fn(),
    getOwnPassenger: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  rides: { cancelUpcomingBookings: jest.fn() },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { listPhotoFilesOf: jest.fn(), purgePhotoFiles: jest.fn() },
}));

const order: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  order.length = 0;
  (passengers.handRidersToTheirOwnAccounts as jest.Mock).mockImplementation(
    async () => {
      order.push("handOver");
    },
  );
  (passengers.listPassengersManagedBy as jest.Mock).mockResolvedValue([
    { id: "managed-greta", userId: null },
    { id: "own-lena", userId: "daughter-lena" },
  ]);
  (passengers.getOwnPassenger as jest.Mock).mockResolvedValue({
    id: "own-lena",
  });
  (rides.cancelUpcomingBookings as jest.Mock).mockImplementation(async () => {
    order.push("cancel");
  });
  (personProfiles.listPhotoFilesOf as jest.Mock).mockResolvedValue([
    { id: "file-1", key: "files/1.webp" },
  ]);
  (accounts.deleteUser as jest.Mock).mockImplementation(async () => {
    order.push("deleteUser");
  });
  (personProfiles.purgePhotoFiles as jest.Mock).mockImplementation(async () => {
    order.push("purge");
  });
});

describe("deleteAccount", () => {
  it("removes the photos of the account and the riders it looked after", async () => {
    await deleteAccount("daughter-lena");

    expect(personProfiles.listPhotoFilesOf).toHaveBeenCalledWith({
      userIds: ["daughter-lena"],
      passengerIds: ["managed-greta"],
    });
    expect(personProfiles.purgePhotoFiles).toHaveBeenCalledWith([
      { id: "file-1", key: "files/1.webp" },
    ]);
    expect(order).toEqual(["handOver", "cancel", "deleteUser", "purge"]);
  });

  it("gives up the seats still ahead of every rider that goes with the account", async () => {
    await deleteAccount("daughter-lena", "admin-1");

    expect(rides.cancelUpcomingBookings).toHaveBeenCalledWith(
      ["managed-greta", "own-lena"],
      "admin-1",
    );
  });

  it("gives them up as the account itself when it leaves on its own", async () => {
    await deleteAccount("daughter-lena");

    expect(rides.cancelUpcomingBookings).toHaveBeenCalledWith(
      ["managed-greta", "own-lena"],
      "daughter-lena",
    );
  });

  it("hands riders with their own account back to themselves before deleting", async () => {
    await deleteAccount("daughter-lena");

    expect(passengers.handRidersToTheirOwnAccounts).toHaveBeenCalledWith(
      "daughter-lena",
    );
  });

  it("erases the account's own rider row instead of handing it to a helper", async () => {
    await deleteAccount("user-1");

    expect(passengers.removeOwnPassenger).toHaveBeenCalledWith("user-1");
  });
});
