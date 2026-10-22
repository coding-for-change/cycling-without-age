import { activity } from "@/lib/activity";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
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

const record = activity.record as jest.Mock;
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

describe("creating a chapter", () => {
  it("gives it a default storage location named after its care home", async () => {
    (chapters.createChapter as jest.Mock).mockResolvedValue({
      ...AARHUS,
      careHomeName: "Plejecenter Solbakken",
    });
    await createChapter({ input: {} as never, actorUserId: "admin" });
    expect(fleet.createDefaultLocation).toHaveBeenCalledWith({
      id: "ch1",
      name: "Plejecenter Solbakken",
      address: "Randersvej 1",
      latitude: 56.17,
      longitude: 10.2,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "chapterCreated", chapterId: "ch1" }),
    );
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
