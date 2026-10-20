import { accounts } from "@/features/accounts";
import { passengers } from "@/features/passengers";
import { personProfiles } from "@/features/person-profiles";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { deleteAccount } from "./delete-account";

jest.mock("@/features/accounts", () => ({
  accounts: { deleteUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    handRidersToTheirOwnAccounts: jest.fn(),
    removeOwnPassenger: jest.fn(),
    removeRidersWithoutAccount: jest.fn(),
    listPassengersManagedBy: jest.fn(),
    getOwnPassenger: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  rides: { cancelUpcomingBookings: jest.fn() },
}));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { withdrawOpenRequests: jest.fn() },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { listPhotoFilesOf: jest.fn(), purgePhotoFiles: jest.fn() },
}));

const order: string[] = [];
const REMOVE = { removeRiders: ["managed-greta"] };

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
  (rideRequests.withdrawOpenRequests as jest.Mock).mockImplementation(
    async () => {
      order.push("withdraw");
    },
  );
  (personProfiles.listPhotoFilesOf as jest.Mock).mockResolvedValue([
    { id: "file-1", key: "files/1.webp" },
  ]);
  (passengers.removeRidersWithoutAccount as jest.Mock).mockImplementation(
    async () => {
      order.push("removeRiders");
    },
  );
  (accounts.deleteUser as jest.Mock).mockImplementation(async () => {
    order.push("deleteUser");
  });
  (personProfiles.purgePhotoFiles as jest.Mock).mockImplementation(async () => {
    order.push("purge");
  });
});

describe("deleteAccount", () => {
  it("deletes only the riders that were confirmed, so one handed over meanwhile makes the delete fail", async () => {
    await deleteAccount("daughter-lena", "daughter-lena", REMOVE);

    expect(passengers.removeRidersWithoutAccount).toHaveBeenCalledWith(
      "daughter-lena",
      ["managed-greta"],
    );
  });

  it("removes the photos of the account and the riders it looked after", async () => {
    await deleteAccount("daughter-lena", "daughter-lena", REMOVE);

    expect(personProfiles.listPhotoFilesOf).toHaveBeenCalledWith({
      userIds: ["daughter-lena"],
      passengerIds: ["managed-greta"],
    });
    expect(personProfiles.purgePhotoFiles).toHaveBeenCalledWith([
      { id: "file-1", key: "files/1.webp" },
    ]);
    expect(order).toEqual([
      "handOver",
      "cancel",
      "withdraw",
      "removeRiders",
      "deleteUser",
      "purge",
    ]);
  });

  it("gives up the seats still ahead of every rider that goes with the account", async () => {
    await deleteAccount("daughter-lena", "admin-1", REMOVE);

    expect(rides.cancelUpcomingBookings).toHaveBeenCalledWith(
      ["managed-greta", "own-lena"],
      "admin-1",
    );
  });

  it("gives them up as the account itself when it leaves on its own", async () => {
    await deleteAccount("daughter-lena", "daughter-lena", REMOVE);

    expect(rides.cancelUpcomingBookings).toHaveBeenCalledWith(
      ["managed-greta", "own-lena"],
      "daughter-lena",
    );
  });

  it("hands riders with their own account back to themselves before deleting", async () => {
    await deleteAccount("daughter-lena", "daughter-lena", REMOVE);

    expect(passengers.handRidersToTheirOwnAccounts).toHaveBeenCalledWith(
      "daughter-lena",
    );
  });

  it("erases the account's own rider row instead of handing it to a helper", async () => {
    await deleteAccount("user-1", "user-1", REMOVE);

    expect(passengers.removeOwnPassenger).toHaveBeenCalledWith("user-1");
  });

  it("refuses to take riders along that nobody chose to remove, and changes nothing", async () => {
    const run = deleteAccount("daughter-lena");
    expect(await run.catch(domainCode)).toBe("managesRiders");
    expect(passengers.handRidersToTheirOwnAccounts).not.toHaveBeenCalled();
    expect(rides.cancelUpcomingBookings).not.toHaveBeenCalled();
    expect(rideRequests.withdrawOpenRequests).not.toHaveBeenCalled();
    expect(passengers.removeRidersWithoutAccount).not.toHaveBeenCalled();
    expect(accounts.deleteUser).not.toHaveBeenCalled();
  });

  it("refuses when the riders shown are not the riders it now manages", async () => {
    const run = deleteAccount("daughter-lena", "daughter-lena", {
      removeRiders: ["someone-else"],
    });
    expect(await run.catch(domainCode)).toBe("managesRiders");
    expect(accounts.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes an account without riders without asking", async () => {
    (passengers.listPassengersManagedBy as jest.Mock).mockResolvedValue([]);
    await deleteAccount("user-1");
    expect(passengers.removeRidersWithoutAccount).not.toHaveBeenCalled();
    expect(accounts.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("closes the account's open ride requests and those of riders going with it", async () => {
    await deleteAccount("daughter-lena", "admin-1", REMOVE);
    expect(rideRequests.withdrawOpenRequests).toHaveBeenCalledWith(
      {
        requesterUserId: "daughter-lena",
        passengerIds: ["managed-greta", "own-lena"],
      },
      "admin-1",
    );
  });
});
