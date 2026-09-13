import { membership } from "@/features/membership";
import { chapterMemberJoined } from "@/use-cases/notifications/kinds/chapter-member-joined";
import { kindOf, kinds } from "@/use-cases/notifications/kinds";
import { handlers } from "@/worker/handlers";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getCountry: jest.fn() },
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

  it.each([
    ["the admin who signed the passenger up", "admin-anke", "user-pernille"],
    ["the admin who joined their own chapter", null, "admin-anke"],
  ])("leaves out %s", async (_label, actorUserId, userId) => {
    listChapterAdmins.mockResolvedValue([
      { userId: "admin-anke" },
      { userId: "admin-bo" },
    ]);

    await expect(
      chapterMemberJoined.recipients({
        type: "chapter.memberJoined",
        chapterId: "chapter-muenchen",
        userId,
        actorUserId,
      }),
    ).resolves.toEqual(["admin-bo"]);
  });
});
