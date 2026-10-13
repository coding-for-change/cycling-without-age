import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { rideLocations } from "@/features/ride-locations";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    rideLocation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const db = prisma as unknown as {
  rideLocation: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
};

const CHAPTER = "chapter-aarhus";
const OTHER = "chapter-odense";

const record = (overrides: Record<string, unknown> = {}) => ({
  id: "loc-1",
  chapterId: CHAPTER,
  kind: "careCenter",
  name: "Solgården",
  address: "Havnegade 1, Aarhus",
  latitude: 56.15,
  longitude: 10.21,
  contactName: null,
  contactPhone: null,
  contactEmail: null,
  notes: null,
  typicalRideKm: null,
  defaultTrishawCount: 2,
  defaultPilotCount: 2,
  defaultMinutes: 90,
  archivedAt: null,
  createdAt: new Date("2026-10-01T10:00:00Z"),
  chapter: { id: CHAPTER, name: "Aarhus", timeZone: "Europe/Copenhagen" },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.rideLocation.create.mockImplementation(async ({ data }) => record(data));
  db.rideLocation.update.mockImplementation(async ({ data }) => record(data));
});

describe("creating a Ride Location", () => {
  it("applies the defaults and normalises blanks to null", async () => {
    await rideLocations.createRideLocation({
      chapterId: CHAPTER,
      name: "  Solgården ",
      contactEmail: "",
      notes: "   ",
    });
    expect(db.rideLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chapterId: CHAPTER,
        kind: "careCenter",
        name: "Solgården",
        contactEmail: null,
        notes: null,
        defaultTrishawCount: 1,
        defaultPilotCount: 1,
      }),
      select: expect.any(Object),
    });
  });

  it("refuses a nameless location, a bad email and half a pin", async () => {
    for (const input of [
      { chapterId: CHAPTER, name: " " },
      { chapterId: CHAPTER, name: "X", contactEmail: "not-an-email" },
      { chapterId: CHAPTER, name: "X", latitude: 56.1, longitude: null },
      { chapterId: CHAPTER, name: "X", defaultTrishawCount: 0 },
    ])
      await expect(
        rideLocations.createRideLocation(input),
      ).rejects.toBeInstanceOf(ZodError);
    expect(db.rideLocation.create).not.toHaveBeenCalled();
  });

  it("returns plain numbers for the typical distance", async () => {
    db.rideLocation.findUnique.mockResolvedValue(
      record({ typicalRideKm: { toNumber: () => 4.5 } }),
    );
    expect((await rideLocations.getRideLocation("loc-1"))?.typicalRideKm).toBe(
      4.5,
    );
  });
});

describe("editing and archiving", () => {
  it("updates only the fields it is given", async () => {
    db.rideLocation.findUnique.mockResolvedValue({
      chapterId: CHAPTER,
      archivedAt: null,
    });
    await rideLocations.updateRideLocation("loc-1", { defaultMinutes: 120 });
    expect(db.rideLocation.update).toHaveBeenCalledWith({
      where: { id: "loc-1" },
      data: { defaultMinutes: 120 },
      select: expect.any(Object),
    });
  });

  it("refuses to edit an archived location", async () => {
    db.rideLocation.findUnique.mockResolvedValue({
      chapterId: CHAPTER,
      archivedAt: new Date(),
    });
    await expect(
      rideLocations.updateRideLocation("loc-1", { name: "New" }),
    ).rejects.toMatchObject({ code: "locationArchived" });
  });

  it("archives once and restores", async () => {
    const now = new Date("2026-10-12T09:00:00Z");
    db.rideLocation.findUnique.mockResolvedValueOnce({
      chapterId: CHAPTER,
      archivedAt: null,
    });
    await rideLocations.archiveRideLocation("loc-1", now);
    expect(db.rideLocation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archivedAt: now } }),
    );

    db.rideLocation.update.mockClear();
    db.rideLocation.findUnique.mockResolvedValueOnce({
      chapterId: CHAPTER,
      archivedAt: now,
    });
    await rideLocations.archiveRideLocation("loc-1", now);
    expect(db.rideLocation.update).not.toHaveBeenCalled();

    db.rideLocation.findUnique.mockResolvedValueOnce({
      chapterId: CHAPTER,
      archivedAt: now,
    });
    await rideLocations.restoreRideLocation("loc-1");
    expect(db.rideLocation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archivedAt: null } }),
    );
  });

  it("reports an unknown location", async () => {
    db.rideLocation.findUnique.mockResolvedValue(null);
    await expect(
      rideLocations.archiveRideLocation("missing"),
    ).rejects.toMatchObject({ code: "unknownLocation" });
  });
});

describe("using a location for a ride", () => {
  it("accepts a live location of the same chapter", async () => {
    db.rideLocation.findUnique.mockResolvedValue(record());
    await expect(
      rideLocations.requireUsableRideLocation("loc-1", CHAPTER),
    ).resolves.toMatchObject({ id: "loc-1" });
  });

  it("refuses a location of another chapter", async () => {
    db.rideLocation.findUnique.mockResolvedValue(record());
    await expect(
      rideLocations.requireUsableRideLocation("loc-1", OTHER),
    ).rejects.toMatchObject({ code: "locationNotInChapter" });
  });

  it("refuses an archived or missing location", async () => {
    db.rideLocation.findUnique.mockResolvedValueOnce(
      record({ archivedAt: new Date() }),
    );
    await expect(
      rideLocations.requireUsableRideLocation("loc-1", CHAPTER),
    ).rejects.toMatchObject({ code: "unknownLocation" });
    db.rideLocation.findUnique.mockResolvedValueOnce(null);
    await expect(
      rideLocations.requireUsableRideLocation("loc-1", CHAPTER),
    ).rejects.toMatchObject({ code: "unknownLocation" });
  });

  it("lists nothing without chapters", async () => {
    expect(await rideLocations.listRideLocations([])).toEqual([]);
    expect(db.rideLocation.findMany).not.toHaveBeenCalled();
  });

  it("counts what a chapter or country delete takes with it, archived included", async () => {
    db.rideLocation.count.mockResolvedValueOnce(3);
    expect(await rideLocations.countChapterRideLocations(CHAPTER)).toBe(3);
    expect(db.rideLocation.count).toHaveBeenLastCalledWith({
      where: { chapterId: CHAPTER },
    });
    db.rideLocation.count.mockResolvedValueOnce(5);
    expect(await rideLocations.countCountryRideLocations(["dk"])).toEqual(
      new Map([["dk", 5]]),
    );
    expect(db.rideLocation.count).toHaveBeenLastCalledWith({
      where: { chapter: { countryId: "dk" } },
    });
  });

  it("refuses a public place as a rider's Care Center", async () => {
    db.rideLocation.findUnique.mockResolvedValueOnce(
      record({ kind: "publicPlace" }),
    );
    await expect(
      rideLocations.requireCareCenter("loc-1", CHAPTER),
    ).rejects.toMatchObject({ code: "locationNotCareCenter" });
    db.rideLocation.findUnique.mockResolvedValueOnce(record());
    await expect(
      rideLocations.requireCareCenter("loc-1", CHAPTER),
    ).resolves.toMatchObject({ id: "loc-1" });
  });
});
