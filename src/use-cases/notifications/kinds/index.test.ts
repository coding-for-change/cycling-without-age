import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { membership } from "@/features/membership";
import { chapterMemberJoined } from "@/use-cases/notifications/kinds/chapter-member-joined";
import { kindOf, kinds } from "@/use-cases/notifications/kinds";
import { handlers } from "@/worker/handlers";
import type { EventOf } from "@/lib/events/catalog";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    getCountry: jest.fn(),
    getSettings: jest.fn(),
  },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));

describe("kinds", () => {
  it("defines at most one kind per event", () => {
    const events = kinds.map((kind) => kind.event);
    expect(new Set(events).size).toBe(events.length);
  });

  it("finds a kind by its event", () => {
    expect(kindOf("pilotApplication.decided").category).toBe("application");
  });

  // `notify` reads the kind by event type, so a listener without one is a job
  // that throws five times in the worker instead of a notification.
  it("covers every event notify listens to", () => {
    const listened = Object.entries(handlers)
      .filter(([, listeners]) => "notify" in listeners)
      .map(([event]) => event);

    expect(listened).not.toHaveLength(0);
    for (const event of listened) expect(() => kindOf(event)).not.toThrow();
  });

  it("refuses an event nobody defined a kind for", () => {
    expect(() => kindOf("ride.requested")).toThrow(
      "no kind for ride.requested",
    );
  });
});

describe("chapter.memberJoined recipients", () => {
  const listChapterAdmins = membership.listChapterAdmins as jest.Mock;
  const getSettings = chapters.getSettings as jest.Mock;

  const joined = (
    actorUserId: string | null,
    userId: string,
  ): EventOf<"chapter.memberJoined"> => ({
    type: "chapter.memberJoined",
    chapterId: "chapter-muenchen",
    userId,
    actorUserId,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getSettings.mockResolvedValue(DEFAULT_CHAPTER_SETTINGS);
    listChapterAdmins.mockResolvedValue([
      { userId: "admin-anke" },
      { userId: "admin-bo" },
    ]);
  });

  it.each([
    ["the admin who signed the passenger up", "admin-anke", "user-pernille"],
    ["the admin who joined their own chapter", null, "admin-anke"],
  ])("leaves out %s", async (_label, actorUserId, userId) => {
    await expect(
      chapterMemberJoined.recipients(joined(actorUserId, userId)),
    ).resolves.toEqual(["admin-bo"]);
  });

  // A chapter that switched the card off gets no inbox row at all, so the
  // admin list is never even read.
  it("tells nobody when the chapter switched the card off", async () => {
    getSettings.mockResolvedValue({
      ...DEFAULT_CHAPTER_SETTINGS,
      notifyOnMemberJoined: false,
    });

    await expect(
      chapterMemberJoined.recipients(joined("admin-anke", "user-pernille")),
    ).resolves.toEqual([]);
    expect(listChapterAdmins).not.toHaveBeenCalled();
  });
});
