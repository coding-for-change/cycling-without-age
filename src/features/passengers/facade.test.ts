import { passengers } from "@/features/passengers";
import {
  deletePassengerWithoutAccount,
  findPassengersManagedBy,
  findPassengersWithOtherAccountManagedBy,
  insertPassengers,
  setPassengerManagers,
  updatePassengerOfUser,
  updatePassengerWithoutAccount,
  closeCareRequest,
  findCareRequest,
  findPendingCareRequest,
  findPendingCareRequestsOfChapters,
  findInvitedRidersOfChapters,
  insertCareRequest,
  insertPassengerIn,
} from "@/features/passengers/services/passengers";

jest.mock("@/features/passengers/services/passengers", () => ({
  countPassengersManagedBy: jest.fn(),
  deletePassengerWithoutAccount: jest.fn(),
  findPassengersWithOtherAccountManagedBy: jest.fn(),
  setPassengerManagers: jest.fn(),
  updatePassengerWithoutAccount: jest.fn(),
  findPassengerOfUser: jest.fn(),
  findPassengersManagedBy: jest.fn(),
  findPassengersOfChapters: jest.fn(),
  insertPassenger: jest.fn(),
  insertPassengers: jest.fn(),
  updatePassengerOfUser: jest.fn(),
  upsertOwnPassenger: jest.fn(),
  closeCareRequest: jest.fn(),
  findCareRequest: jest.fn(),
  findPendingCareRequest: jest.fn(),
  findPendingCareRequestsOfChapters: jest.fn(),
  findInvitedRidersOfChapters: jest.fn(),
  insertCareRequest: jest.fn(),
  insertPassengerIn: jest.fn(),
}));

const emitted: unknown[] = [];
jest.mock("@/lib/events", () => ({
  transaction: (
    fn: (tx: object, emit: (event: unknown) => Promise<void>) => unknown,
  ) =>
    fn({}, async (event) => {
      emitted.push(event);
    }),
}));

const updateRow = updatePassengerOfUser as jest.Mock;

const USER = "user-pernille";

beforeEach(() => {
  jest.clearAllMocks();
  updateRow.mockResolvedValue({ count: 1 });
});

describe("updateOwnRiderDetails", () => {
  it("writes the patch onto the rider row this account books with", async () => {
    await passengers.updateOwnRiderDetails(USER, { gender: "female" });

    expect(updateRow).toHaveBeenCalledWith(USER, { gender: "female" });
  });

  it("coerces an ISO date string and carries both fields through", async () => {
    await passengers.updateOwnRiderDetails(USER, {
      birthDate: "1948-04-02",
      gender: "male",
    });

    expect(updateRow).toHaveBeenCalledWith(USER, {
      birthDate: new Date("1948-04-02"),
      gender: "male",
    });
  });

  it("writes nothing when the patch carries neither field", async () => {
    await expect(passengers.updateOwnRiderDetails(USER, {})).resolves.toEqual({
      count: 0,
    });
    await passengers.updateOwnRiderDetails(USER, {
      birthDate: undefined,
      gender: undefined,
    });

    expect(updateRow).not.toHaveBeenCalled();
  });

  it("refuses a birth date outside the plausible range", async () => {
    await expect(
      passengers.updateOwnRiderDetails(USER, { birthDate: "1899-04-02" }),
    ).rejects.toThrow();
    expect(updateRow).not.toHaveBeenCalled();
  });
});

describe("addManagedPassengers", () => {
  const managed = findPassengersManagedBy as jest.Mock;
  const insertMany = insertPassengers as jest.Mock;
  const rider = {
    firstName: "Jens",
    lastName: "Holm",
    birthDate: "1941-02-11",
    gender: "male" as const,
  };

  it("stores each rider with their own pickup place and no login", async () => {
    managed.mockResolvedValue([]);

    await passengers.addManagedPassengers(USER, "chapter-a", [
      { ...rider, pickup: { residence: "careHome" } },
      {
        ...rider,
        firstName: "Inge",
        pickup: {
          residence: "home",
          address: "Nørregade 1",
          latitude: 55.6,
          longitude: 12.5,
        },
      },
    ]);

    expect(insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        firstName: "Jens",
        userId: null,
        managedByUserId: USER,
        chapterId: "chapter-a",
        residence: "careHome",
      }),
      expect.objectContaining({
        firstName: "Inge",
        residence: "home",
        address: "Nørregade 1",
        latitude: 55.6,
        longitude: 12.5,
      }),
    ]);
  });

  it("refuses a rider in a different chapter from the ones already managed", async () => {
    managed.mockResolvedValue([{ chapterId: "chapter-b" }]);

    await expect(
      passengers.addManagedPassengers(USER, "chapter-a", [rider]),
    ).rejects.toMatchObject({ code: "passengerChapterMismatch" });
    expect(insertMany).not.toHaveBeenCalled();
  });

  it("counts only riders without an account of their own towards the limit", async () => {
    managed.mockResolvedValue([
      ...Array.from({ length: 9 }, (_, index) => ({
        chapterId: "chapter-a",
        userId: null,
        id: `p-${index}`,
      })),
      { chapterId: "chapter-a", userId: USER, id: "p-own" },
      { chapterId: "chapter-a", userId: "user-other", id: "p-other" },
    ]);

    await passengers.addManagedPassengers(USER, "chapter-a", [rider]);
    expect(insertMany).toHaveBeenCalled();

    await expect(
      passengers.addManagedPassengers(USER, "chapter-a", [rider, rider]),
    ).rejects.toMatchObject({ code: "tooManyRiders" });
  });
});

describe("othersOf", () => {
  it("keeps only riders without an account of their own", () => {
    expect(
      passengers.othersOf([
        { id: "a", userId: null },
        { id: "b", userId: USER },
        { id: "c", userId: "user-other" },
      ]),
    ).toEqual([{ id: "a", userId: null }]);
  });
});

describe("updateManagedRider", () => {
  const updateManaged = updatePassengerWithoutAccount as jest.Mock;

  beforeEach(() => updateManaged.mockResolvedValue({ count: 1 }));

  it("moves a rider to a care home and forgets their old address", async () => {
    await passengers.updateManagedRider("managed-greta", {
      pickup: { residence: "careHome" },
    });

    expect(updateManaged).toHaveBeenCalledWith("managed-greta", {
      residence: "careHome",
      address: null,
      latitude: null,
      longitude: null,
    });
  });

  it("writes only the fields the patch carries", async () => {
    await passengers.updateManagedRider("managed-greta", {
      lastName: " Holm ",
      birthDate: "1938-02-11",
    });

    expect(updateManaged).toHaveBeenCalledWith("managed-greta", {
      lastName: "Holm",
      birthDate: new Date("1938-02-11"),
    });
  });

  it("writes nothing for an empty patch and refuses unknown fields", async () => {
    await passengers.updateManagedRider("managed-greta", {});
    await expect(
      passengers.updateManagedRider("managed-greta", {
        userId: "intruder",
      } as never),
    ).rejects.toThrow();
    expect(updateManaged).not.toHaveBeenCalled();
  });

  it("refuses a rider that has an account of their own", async () => {
    updateManaged.mockResolvedValue({ count: 0 });

    await expect(
      passengers.updateManagedRider("p-karl", { gender: "male" }),
    ).rejects.toMatchObject({ code: "unknownPassenger" });
  });
});

describe("removeManagedRider", () => {
  it("refuses a rider that has an account of their own", async () => {
    (deletePassengerWithoutAccount as jest.Mock).mockResolvedValue({
      count: 0,
    });

    await expect(passengers.removeManagedRider("p-karl")).rejects.toMatchObject(
      { code: "unknownPassenger" },
    );
  });
});

describe("handRidersToTheirOwnAccounts", () => {
  it("makes every rider with an account their own manager", async () => {
    (findPassengersWithOtherAccountManagedBy as jest.Mock).mockResolvedValue([
      { id: "p-otto", userId: "resident-otto" },
    ]);

    await expect(passengers.handRidersToTheirOwnAccounts(USER)).resolves.toBe(
      1,
    );
    expect(setPassengerManagers).toHaveBeenCalledWith([
      { id: "p-otto", managedByUserId: "resident-otto" },
    ]);
  });

  it("writes nothing when nobody has an account", async () => {
    (findPassengersWithOtherAccountManagedBy as jest.Mock).mockResolvedValue(
      [],
    );

    await passengers.handRidersToTheirOwnAccounts(USER);
    expect(setPassengerManagers).not.toHaveBeenCalled();
  });
});

describe("care requests", () => {
  const managed = findPassengersManagedBy as jest.Mock;
  const pending = findPendingCareRequest as jest.Mock;
  const insertRequest = insertCareRequest as jest.Mock;
  const find = findCareRequest as jest.Mock;
  const close = closeCareRequest as jest.Mock;
  const insertRider = insertPassengerIn as jest.Mock;
  const rider = {
    firstName: "Inge",
    lastName: "Holm",
    birthDate: "1939-07-30",
    gender: "female" as const,
  };
  const request = {
    id: "care-1",
    chapterId: "chapter-a",
    caretakerUserId: "user-hilde",
    requestedByUserId: "admin-1",
    status: "pending",
    firstName: "Inge",
    lastName: "Holm",
    birthDate: new Date("1939-07-30"),
    gender: "female",
    residence: "careHome",
    address: null,
    latitude: null,
    longitude: null,
    relationship: "child",
  };

  beforeEach(() => {
    emitted.length = 0;
    managed.mockResolvedValue([]);
    pending.mockResolvedValue(null);
    insertRequest.mockResolvedValue({ id: "care-1" });
    find.mockResolvedValue(request);
    close.mockResolvedValue({ count: 1 });
    insertRider.mockResolvedValue({ id: "p-1" });
  });

  it("asks the caretaker once and tells them about it", async () => {
    await passengers.requestCare({
      chapterId: "chapter-a",
      caretakerUserId: "user-hilde",
      requestedByUserId: "admin-1",
      rider,
    });

    expect(insertRequest).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([
      expect.objectContaining({ type: "care.requested", userId: "user-hilde" }),
    ]);
  });

  it("keeps the helper name the admin typed, not the account's own", async () => {
    await passengers.requestCare({
      chapterId: "chapter-a",
      caretakerUserId: "user-hilde",
      requestedByUserId: "admin-1",
      rider,
      helperName: "  Hilde  ",
    });

    expect(insertRequest).toHaveBeenCalledWith(
      expect.objectContaining({ helperName: "Hilde" }),
      expect.anything(),
    );
  });

  it("does not ask twice for the same rider", async () => {
    pending.mockResolvedValue({ id: "care-1" });

    await passengers.requestCare({
      chapterId: "chapter-a",
      caretakerUserId: "user-hilde",
      requestedByUserId: "admin-1",
      rider,
    });

    expect(insertRequest).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("adds the rider without an account when accepted", async () => {
    await expect(
      passengers.acceptCareRequest("care-1", "user-hilde"),
    ).resolves.toEqual({
      passengerId: "p-1",
      relationship: "child",
      chapterId: "chapter-a",
    });

    expect(insertRider).toHaveBeenCalledWith(
      expect.objectContaining({
        managedByUserId: "user-hilde",
        userId: null,
        chapterId: "chapter-a",
      }),
      {},
    );
    expect(emitted).toEqual([
      expect.objectContaining({ type: "care.decided", accepted: true }),
    ]);
  });

  it("refuses an answer from someone else or to a closed request", async () => {
    await expect(
      passengers.acceptCareRequest("care-1", "user-stranger"),
    ).rejects.toMatchObject({ code: "notFound" });

    find.mockResolvedValue({ ...request, status: "declined" });
    await expect(
      passengers.acceptCareRequest("care-1", "user-hilde"),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(insertRider).not.toHaveBeenCalled();
  });

  it("refuses a caretaker whose riders ride with another chapter", async () => {
    managed.mockResolvedValue([{ chapterId: "chapter-b", userId: null }]);

    await expect(
      passengers.acceptCareRequest("care-1", "user-hilde"),
    ).rejects.toMatchObject({ code: "passengerChapterMismatch" });
  });

  it("refuses a caretaker who already looks after the most riders", async () => {
    managed.mockResolvedValue(
      Array.from({ length: 10 }, () => ({
        chapterId: "chapter-a",
        userId: null,
      })),
    );

    await expect(
      passengers.acceptCareRequest("care-1", "user-hilde"),
    ).rejects.toMatchObject({ code: "tooManyRiders" });
    expect(insertRider).not.toHaveBeenCalled();
  });

  it("loses the race cleanly when the request was answered meanwhile", async () => {
    close.mockResolvedValue({ count: 0 });

    await expect(
      passengers.declineCareRequest("care-1", "user-hilde"),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(emitted).toEqual([]);
  });
});

describe("listWaitingRiders", () => {
  const pendingRequests = findPendingCareRequestsOfChapters as jest.Mock;
  const invited = findInvitedRidersOfChapters as jest.Mock;

  it("lists asked and invited helpers alike, oldest first", async () => {
    pendingRequests.mockResolvedValue([
      {
        id: "care-1",
        firstName: "Inge",
        lastName: "Berg",
        helperName: "Hilde",
        createdAt: new Date("2026-10-02"),
      },
    ]);
    invited.mockResolvedValue([
      {
        id: "p-1",
        firstName: "Karl",
        lastName: "Moos",
        createdAt: new Date("2026-10-01"),
        managedBy: { name: "Jens" },
      },
    ]);

    await expect(passengers.listWaitingRiders(["chapter-a"])).resolves.toEqual([
      {
        id: "p-1",
        firstName: "Karl",
        lastName: "Moos",
        helperName: "Jens",
        createdAt: new Date("2026-10-01"),
      },
      {
        id: "care-1",
        firstName: "Inge",
        lastName: "Berg",
        helperName: "Hilde",
        createdAt: new Date("2026-10-02"),
      },
    ]);
  });

  it("reads nothing without chapters", async () => {
    await expect(passengers.listWaitingRiders([])).resolves.toEqual([]);
    expect(pendingRequests).not.toHaveBeenCalled();
    expect(invited).not.toHaveBeenCalled();
  });
});
