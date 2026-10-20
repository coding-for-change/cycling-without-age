import { activity } from "@/lib/activity";
import { chapters } from "@/features/chapters";
import { rideLocations } from "@/features/ride-locations";
import { training } from "@/features/training";
import { createChapter, deleteChapter, updateChapter } from "./manage-chapter";

jest.mock("@/lib/activity", () => ({
  activity: { record: jest.fn() },
}));
jest.mock("@/features/training", () => ({
  training: { ownerMedia: jest.fn(), purgeOwnerMedia: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: {
    createChapter: jest.fn(),
    getChapter: jest.fn(),
    updateChapter: jest.fn(),
    deleteChapter: jest.fn(),
    diffChapter: jest.fn(),
    withDerivedTimeZone: jest.fn(),
  },
}));

jest.mock("@/features/fleet", () => ({
  fleet: { createDefaultLocation: jest.fn() },
}));
jest.mock("@/features/ride-locations", () => ({
  rideLocations: {
    createRideLocation: jest.fn(),
    countChapterRideLocations: jest.fn(),
  },
}));

const record = activity.record as jest.Mock;
const createRideLocation = rideLocations.createRideLocation as jest.Mock;
const countRideLocations = rideLocations.countChapterRideLocations as jest.Mock;
const getChapter = chapters.getChapter as jest.Mock;
const diffChapter = chapters.diffChapter as jest.Mock;
const withDerivedTimeZone = chapters.withDerivedTimeZone as jest.Mock;

const AARHUS = {
  id: "ch1",
  name: "Aarhus Nord",
  slug: "aarhus-nord",
  city: "Aarhus",
  address: "Randersvej 1",
  careHomeName: null,
  description: "",
  logo: null,
  latitude: 56.17,
  longitude: 10.2,
  serviceRadiusKm: 10,
  countryId: "dk",
  createdAt: new Date(),
  metadata: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  // The enrichment itself is covered in the chapters slice; here it just has to
  // be the thing that reaches both the diff and the write.
  withDerivedTimeZone.mockImplementation((input) => input);
  getChapter.mockResolvedValue(AARHUS);
  (chapters.updateChapter as jest.Mock).mockResolvedValue(AARHUS);
  countRideLocations.mockResolvedValue(0);
  diffChapter.mockReturnValue([
    { field: "serviceRadiusKm", from: "10", to: "12" },
  ]);
});

describe("updating a chapter", () => {
  it("records one line per changed field, credited to the admin", async () => {
    await updateChapter({
      chapterId: "ch1",
      actorUserId: "admin",
      input: { name: "Aarhus Nord", serviceRadiusKm: 12 },
    });
    expect(chapters.updateChapter).toHaveBeenCalledWith("ch1", {
      name: "Aarhus Nord",
      serviceRadiusKm: 12,
    });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({
      userId: "admin",
      actorUserId: "admin",
      chapterId: "ch1",
      type: "chapterUpdated",
      payload: { field: "serviceRadiusKm", from: "10", to: "12" },
    });
  });
});

const SOLBAKKEN = {
  ...AARHUS,
  careHomeName: "Plejecenter Solbakken",
};

const careHomeLocation = {
  chapterId: "ch1",
  kind: "careCenter",
  name: "Plejecenter Solbakken",
  address: "Randersvej 1",
  latitude: 56.17,
  longitude: 10.2,
};

describe("a chapter's care home", () => {
  it("becomes the first ride location of a new chapter", async () => {
    (chapters.createChapter as jest.Mock).mockResolvedValue(SOLBAKKEN);
    await createChapter({ input: {} as never, actorUserId: "admin" });
    expect(createRideLocation).toHaveBeenCalledWith(careHomeLocation);
  });

  it("gives a chapter without one no ride location", async () => {
    (chapters.createChapter as jest.Mock).mockResolvedValue(AARHUS);
    await createChapter({ input: {} as never, actorUserId: "admin" });
    expect(createRideLocation).not.toHaveBeenCalled();
  });

  it("becomes a ride location when a chapter names it later", async () => {
    (chapters.updateChapter as jest.Mock).mockResolvedValue(SOLBAKKEN);
    await updateChapter({
      chapterId: "ch1",
      input: { careHomeName: "Plejecenter Solbakken" },
      actorUserId: "admin",
    });
    expect(countRideLocations).toHaveBeenCalledWith("ch1");
    expect(createRideLocation).toHaveBeenCalledWith(careHomeLocation);
  });

  it("adds nothing to a chapter that already has ride locations", async () => {
    (chapters.updateChapter as jest.Mock).mockResolvedValue(SOLBAKKEN);
    countRideLocations.mockResolvedValue(2);
    await updateChapter({
      chapterId: "ch1",
      input: { careHomeName: "Plejecenter Solbakken" },
      actorUserId: "admin",
    });
    expect(createRideLocation).not.toHaveBeenCalled();
  });

  it("leaves the ride locations alone when the care home is renamed", async () => {
    getChapter.mockResolvedValue(SOLBAKKEN);
    (chapters.updateChapter as jest.Mock).mockResolvedValue({
      ...SOLBAKKEN,
      careHomeName: "Solbakken",
    });
    await updateChapter({
      chapterId: "ch1",
      input: { careHomeName: "Solbakken" },
      actorUserId: "admin",
    });
    expect(countRideLocations).not.toHaveBeenCalled();
    expect(createRideLocation).not.toHaveBeenCalled();
  });
});

describe("deleting a chapter", () => {
  it("keeps the line global so the cascade cannot take it", async () => {
    await deleteChapter({ chapterId: "ch1", actorUserId: "admin" });
    expect(chapters.deleteChapter).toHaveBeenCalledWith("ch1");
    expect(record).toHaveBeenCalledWith({
      userId: "admin",
      actorUserId: "admin",
      type: "chapterDeleted",
      payload: { name: "Aarhus Nord", slug: "aarhus-nord" },
    });
  });

  it("collects the chapter's training media before the cascade and purges it after", async () => {
    const media = {
      videos: [
        {
          id: "v1",
          mediaKey: "k",
          sourceKey: "training/sources/k",
          uploadId: null,
        },
      ],
      attachments: [{ id: "f1", key: "files/f1.pdf" }],
    };
    const order: string[] = [];
    (training.ownerMedia as jest.Mock).mockImplementation(async () => {
      order.push("collect");
      return media;
    });
    (chapters.deleteChapter as jest.Mock).mockImplementation(async () => {
      order.push("delete");
    });
    (training.purgeOwnerMedia as jest.Mock).mockImplementation(async () => {
      order.push("purge");
    });

    await deleteChapter({ chapterId: "ch1", actorUserId: "admin" });

    expect(training.ownerMedia).toHaveBeenCalledWith({
      chapterIds: ["ch1"],
      countryIds: [],
    });
    expect(training.purgeOwnerMedia).toHaveBeenCalledWith(media, "admin");
    expect(order).toEqual(["collect", "delete", "purge"]);
  });
});

it("diffs and writes the same patch, so a derived zone is recorded", async () => {
  const input = { latitude: 39.7392, longitude: -104.9903 };
  const patch = { ...input, timeZone: "America/Denver" };
  withDerivedTimeZone.mockReturnValue(patch);
  diffChapter.mockReturnValue([
    { field: "timeZone", from: "Europe/Copenhagen", to: "America/Denver" },
  ]);

  await updateChapter({ chapterId: "ch1", input, actorUserId: "admin" });

  expect(diffChapter).toHaveBeenCalledWith(AARHUS, patch);
  expect(chapters.updateChapter).toHaveBeenCalledWith("ch1", patch);
  expect(record).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "chapterUpdated",
      payload: expect.objectContaining({ field: "timeZone" }),
    }),
  );
});
