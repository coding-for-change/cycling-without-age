import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { deleteAccount } from "./delete-account";

jest.mock("@/features/accounts", () => ({
  accounts: { deleteUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    handRidersToTheirOwnAccounts: jest.fn(),
    removeOwnPassenger: jest.fn(),
    listPassengersManagedBy: jest.fn(),
  },
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
    expect(order).toEqual(["handOver", "deleteUser", "purge"]);
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
