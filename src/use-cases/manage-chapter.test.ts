import { activity } from "@/lib/activity";
import { chapters } from "@/features/chapters";
import { deleteChapter, updateChapter } from "./manage-chapter";

jest.mock("@/lib/activity", () => ({
  activity: { record: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    updateChapter: jest.fn(),
    deleteChapter: jest.fn(),
    diffChapter: jest.fn(),
  },
}));

const record = activity.record as jest.Mock;
const getChapter = chapters.getChapter as jest.Mock;
const diffChapter = chapters.diffChapter as jest.Mock;

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
