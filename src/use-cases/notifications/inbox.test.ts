import { chapters } from "@/features/chapters";
import { notifications } from "@/features/notifications";
import { listInbox } from "@/use-cases/notifications/inbox";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getCountry: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/notifications", () => ({
  notifications: { listInbox: jest.fn(), unseenCount: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));

const list = notifications.listInbox as jest.Mock;

const USER = "user-pernille";
const CREATED = new Date("2026-09-09T10:00:00Z");

const row = (over: Record<string, unknown> = {}) => ({
  id: "notif-1",
  href: "/pilot",
  createdAt: CREATED,
  readAt: null,
  seenAt: null,
  payload: { chapterName: "München", approved: true, note: null },
  event: { type: "pilotApplication.decided" },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (chapters.getChapter as jest.Mock).mockResolvedValue({ name: "München" });
});

describe("listInbox", () => {
  it("renders each row in the reader's language, not the writer's", async () => {
    list.mockResolvedValue([row()]);

    expect(await listInbox(USER, "de")).toEqual([
      {
        id: "notif-1",
        category: "application",
        title: "Willkommen an Bord",
        body: expect.stringContaining("München"),
        href: "/pilot",
        createdAt: CREATED,
        readAt: null,
        seenAt: null,
      },
    ]);

    const [english] = await listInbox(USER, "en");
    expect(english.body).toContain("has approved you as a pilot");
  });

  it("prefers a kind's short title over its email heading", async () => {
    list.mockResolvedValue([
      row({
        payload: { chapterName: "München", role: "pilot" },
        event: { type: "user.onboarded" },
        href: "/pilot",
      }),
    ]);

    const [item] = await listInbox(USER, "en");
    expect(item.title).toBe("Welcome to München");
    expect(item.category).toBe("welcome");
  });

  it("drops a row whose kind is gone instead of blanking the bell", async () => {
    list.mockResolvedValue([row({ event: { type: "ride.requested" } }), row()]);

    expect(await listInbox(USER, "en")).toHaveLength(1);
  });

  it("drops a row whose payload no longer fits its kind", async () => {
    list.mockResolvedValue([row({ payload: { approved: "yes" } }), row()]);

    expect(await listInbox(USER, "en")).toHaveLength(1);
  });

  it("carries the read and seen stamps through untouched", async () => {
    const readAt = new Date("2026-09-09T11:00:00Z");
    list.mockResolvedValue([row({ readAt, seenAt: readAt })]);

    const [item] = await listInbox(USER, "en");
    expect(item).toMatchObject({ readAt, seenAt: readAt });
  });
});
