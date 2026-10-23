import { passengers } from "@/features/passengers";
import {
  deletePassengerWithoutAccount,
  findPassengersManagedBy,
  insertPassenger,
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
  findPassengerById,
  moveRiderToManager,
  findPendingCareLinks,
  declinePendingCareLinks,
  linkPassengerManager,
  findPassengerOfUser,
  deletePassengerOfUser,
  updatePassengerNeeds,
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
  findPassengerById: jest.fn(),
  moveRiderToManager: jest.fn(),
  findPendingCareLinks: jest.fn(),
  declinePendingCareLinks: jest.fn(),
  linkPassengerManager: jest.fn(),
  deletePassengerOfUser: jest.fn(),
  updatePassengerNeeds: jest.fn(),
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

describe("addPassenger", () => {
  it("writes the rider's needs in the same insert as the rider", async () => {
    (findPassengersManagedBy as jest.Mock).mockResolvedValue([]);

    await passengers.addPassenger(
      {
        chapterId: "chapter-aarhus",
        managedByUserId: USER,
        userId: null,
        firstName: "Pernille",
        lastName: "Holm",
        birthDate: new Date("1948-04-02"),
        gender: "female",
      },
      { needsWheelchairBike: true, note: "  " },
    );

    expect(insertPassenger).toHaveBeenCalledTimes(1);
    expect(insertPassenger).toHaveBeenCalledWith(
      expect.objectContaining({
        needsWheelchairBike: true,
        note: null,
      }),
    );
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

  it("keeps the riding needs a carer gives for a new rider", async () => {
    managed.mockResolvedValue([]);

    await passengers.addManagedPassengers(USER, "chapter-a", [
      {
        ...rider,
        pickup: { residence: "careHome" },
        needs: { needsWheelchairBike: true, note: "  Hard of hearing " },
      },
      { ...rider, pickup: { residence: "careHome" } },
    ]);

    const [rows] = insertMany.mock.calls[0];
    expect(rows[0]).toMatchObject({
      needsWheelchairBike: true,
      note: "Hard of hearing",
    });
    expect(rows[1]).not.toHaveProperty("needsWheelchairBike");
    expect(rows[1]).not.toHaveProperty("needs");
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
      riderUserId: null,
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

describe("handOverRider", () => {
  const rider = {
    id: "erna",
    chapterId: "chapter-muenchen",
    managedByUserId: "user-old",
    userId: null,
  };

  beforeEach(() => {
    emitted.length = 0;
    (findPassengerById as jest.Mock).mockResolvedValue(rider);
    (findPassengersManagedBy as jest.Mock).mockResolvedValue([]);
    (moveRiderToManager as jest.Mock).mockResolvedValue({ count: 1 });
  });

  it("moves the rider from the old manager and says who moved them", async () => {
    await passengers.handOverRider("erna", "user-new", "user-admin");
    expect(moveRiderToManager).toHaveBeenCalledWith(
      "erna",
      "user-old",
      "user-new",
      {},
    );
    expect(emitted).toEqual([
      {
        type: "rider.handedOver",
        passengerId: "erna",
        chapterId: "chapter-muenchen",
        actorUserId: "user-admin",
        fromUserId: "user-old",
        toUserId: "user-new",
        invited: false,
      },
    ]);
  });

  it("refuses the manager they already have", async () => {
    await expect(
      passengers.handOverRider("erna", "user-old", "user-admin"),
    ).rejects.toMatchObject({ code: "sameManager" });
  });

  it("refuses a new manager whose riders ride with another chapter", async () => {
    (findPassengersManagedBy as jest.Mock).mockResolvedValue([
      { chapterId: "chapter-hamburg", userId: null },
    ]);
    await expect(
      passengers.handOverRider("erna", "user-new", "user-admin"),
    ).rejects.toMatchObject({ code: "passengerChapterMismatch" });
    expect(moveRiderToManager).not.toHaveBeenCalled();
  });

  it("refuses when someone else moved the rider first", async () => {
    (moveRiderToManager as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(
      passengers.handOverRider("erna", "user-new", "user-admin"),
    ).rejects.toMatchObject({ code: "unknownPassenger" });
    expect(emitted).toEqual([]);
  });
});

describe("care links for a rider with their own account", () => {
  const managed = findPassengersManagedBy as jest.Mock;
  const byId = findPassengerById as jest.Mock;
  const links = findPendingCareLinks as jest.Mock;
  const insertRequest = insertCareRequest as jest.Mock;
  const find = findCareRequest as jest.Mock;
  const close = closeCareRequest as jest.Mock;
  const link = linkPassengerManager as jest.Mock;
  const declineOthers = declinePendingCareLinks as jest.Mock;
  const insertRider = insertPassengerIn as jest.Mock;
  const rider = {
    id: "p-erna",
    chapterId: "chapter-a",
    userId: "user-erna",
    managedByUserId: "user-erna",
    firstName: "Erna",
    lastName: "Lund",
    birthDate: new Date("1936-03-01"),
    gender: "female",
  };
  const request = {
    id: "care-link",
    chapterId: "chapter-a",
    caretakerUserId: "user-hilde",
    requestedByUserId: "admin-1",
    status: "pending",
    passengerId: "p-erna",
    relationship: null,
  };

  beforeEach(() => {
    emitted.length = 0;
    managed.mockResolvedValue([]);
    byId.mockResolvedValue(rider);
    links.mockResolvedValue([]);
    insertRequest.mockResolvedValue({ id: "care-link" });
    find.mockResolvedValue(request);
    close.mockResolvedValue({ count: 1 });
    link.mockResolvedValue({ count: 1 });
    declineOthers.mockResolvedValue({ count: 0 });
  });

  const ask = () =>
    passengers.requestCareLink({
      passengerId: "p-erna",
      caretakerUserId: "user-hilde",
      requestedByUserId: "admin-1",
    });

  it("asks the carer about the existing rider and changes nothing yet", async () => {
    await expect(ask()).resolves.toEqual({
      id: "care-link",
      chapterId: "chapter-a",
    });

    expect(insertRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        passengerId: "p-erna",
        caretakerUserId: "user-hilde",
        firstName: "Erna",
      }),
      expect.anything(),
    );
    expect(link).not.toHaveBeenCalled();
    expect(emitted).toEqual([
      expect.objectContaining({ type: "care.requested", userId: "user-hilde" }),
    ]);
  });

  it("does not ask the same carer twice", async () => {
    links.mockResolvedValue([
      { id: "care-old", caretakerUserId: "user-hilde" },
    ]);

    await expect(ask()).resolves.toEqual({
      id: "care-old",
      chapterId: "chapter-a",
    });
    expect(insertRequest).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("only links riders who ride with their own account and book for themselves", async () => {
    byId.mockResolvedValue({ ...rider, userId: null });
    await expect(ask()).rejects.toMatchObject({ code: "unknownPassenger" });

    byId.mockResolvedValue({ ...rider, managedByUserId: "user-other" });
    await expect(ask()).rejects.toMatchObject({ code: "unknownPassenger" });

    byId.mockResolvedValue(null);
    await expect(ask()).rejects.toMatchObject({ code: "unknownPassenger" });
    expect(insertRequest).not.toHaveBeenCalled();
  });

  it("refuses to make a rider their own carer", async () => {
    await expect(
      passengers.requestCareLink({
        passengerId: "p-erna",
        caretakerUserId: "user-erna",
        requestedByUserId: "admin-1",
      }),
    ).rejects.toMatchObject({ code: "sameManager" });
  });

  it("refuses a carer whose riders ride with another chapter", async () => {
    managed.mockResolvedValue([{ chapterId: "chapter-b", userId: null }]);

    await expect(ask()).rejects.toMatchObject({
      code: "passengerChapterMismatch",
    });
  });

  it("makes the carer the rider's manager on yes and closes other open asks", async () => {
    await expect(
      passengers.acceptCareRequest("care-link", "user-hilde"),
    ).resolves.toEqual({
      passengerId: "p-erna",
      relationship: null,
      chapterId: "chapter-a",
      riderUserId: "user-erna",
    });

    expect(link).toHaveBeenCalledWith(
      "p-erna",
      "user-erna",
      "user-hilde",
      expect.anything(),
    );
    expect(insertRider).not.toHaveBeenCalled();
    expect(declineOthers).toHaveBeenCalledWith("p-erna", expect.anything());
    expect(emitted).toEqual([
      expect.objectContaining({ type: "care.decided", accepted: true }),
      {
        type: "care.linked",
        requestId: "care-link",
        chapterId: "chapter-a",
        userId: "user-erna",
        actorUserId: "user-hilde",
        passengerId: "p-erna",
      },
    ]);
  });

  it("refuses a yes once the rider has a carer or moved chapter", async () => {
    byId.mockResolvedValue({ ...rider, managedByUserId: "user-other" });
    await expect(
      passengers.acceptCareRequest("care-link", "user-hilde"),
    ).rejects.toMatchObject({ code: "notFound" });

    byId.mockResolvedValue({ ...rider, chapterId: "chapter-b" });
    await expect(
      passengers.acceptCareRequest("care-link", "user-hilde"),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(link).not.toHaveBeenCalled();
  });

  it("loses the race cleanly when the rider changed meanwhile", async () => {
    link.mockResolvedValue({ count: 0 });

    await expect(
      passengers.acceptCareRequest("care-link", "user-hilde"),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(close).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("closes open asks about a rider whose own row goes away", async () => {
    (findPassengerOfUser as jest.Mock).mockResolvedValue(rider);

    await passengers.removeOwnPassenger("user-erna");

    expect(declineOthers).toHaveBeenCalledWith("p-erna");
    expect(deletePassengerOfUser).toHaveBeenCalledWith("user-erna");
  });
});

describe("needs of a rider someone books for", () => {
  const managed = findPassengersManagedBy as jest.Mock;
  const save = updatePassengerNeeds as jest.Mock;

  beforeEach(() => {
    managed.mockResolvedValue([
      {
        id: "p-own",
        userId: "user-hilde",
        chapterId: "chapter-a",
        needsWheelchairBike: false,
        note: null,
      },
      {
        id: "p-inge",
        userId: null,
        chapterId: "chapter-a",
        needsWheelchairBike: true,
        note: "Loves the harbour",
      },
      {
        id: "p-erna",
        userId: "user-erna",
        chapterId: "chapter-a",
        needsWheelchairBike: false,
        note: null,
      },
    ]);
  });

  it("lets the manager read and change them, with or without an account of the rider's own", async () => {
    await expect(
      passengers.getManagedRiderNeeds("p-inge", "user-hilde"),
    ).resolves.toEqual({
      needsWheelchairBike: true,
      note: "Loves the harbour",
    });

    await expect(
      passengers.setManagedRiderNeeds("p-erna", "user-hilde", {
        needsWheelchairBike: true,
      }),
    ).resolves.toEqual({ chapterId: "chapter-a" });
    expect(managed).toHaveBeenCalledWith("user-hilde");
    expect(save).toHaveBeenCalledWith("p-erna", { needsWheelchairBike: true });
  });

  it("refuses a rider this account does not manage, and its own row", async () => {
    for (const id of ["p-stranger", "p-own"])
      await expect(
        passengers.setManagedRiderNeeds(id, "user-hilde", { note: "x" }),
      ).rejects.toMatchObject({ code: "unknownPassenger" });
    expect(save).not.toHaveBeenCalled();
  });
});
