import { activity } from "@/features/activity";
import { chapters } from "@/features/chapters";
import { deleteChapter, diffChapter, updateChapter } from "./manage-chapter";

jest.mock("@/features/activity", () => ({
  activity: { record: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    updateChapter: jest.fn(),
    deleteChapter: jest.fn(),
  },
}));

const record = activity.record as jest.Mock;
const getChapter = chapters.getChapter as jest.Mock;

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
  getChapter.mockResolvedValue(AARHUS);
});

describe("diffing a chapter edit", () => {
  it("is silent when nothing changed", () => {
    expect(diffChapter(AARHUS as never, { name: "Aarhus Nord" })).toEqual([]);
  });

  it("folds a moved pin and its new address into one location change", () => {
    const changes = diffChapter(AARHUS as never, {
      latitude: 56.2,
      longitude: 10.3,
      address: "Vestergade 2",
      serviceRadiusKm: 15,
    });
    expect(changes).toEqual([
      { field: "location", from: "Randersvej 1", to: "Vestergade 2" },
      { field: "serviceRadiusKm", from: "10", to: "15" },
    ]);
  });

  it("reads a cleared optional field as a change to nothing", () => {
    expect(diffChapter(AARHUS as never, { address: null })).toEqual([
      { field: "location", from: "Randersvej 1", to: "56.17000, 10.20000" },
    ]);
  });
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
});
