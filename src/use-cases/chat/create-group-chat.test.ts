import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import type { Access } from "@/lib/access";
import { createGroupChat } from "@/use-cases/chat/create-group-chat";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryId: jest.fn() },
}));
jest.mock("@/features/chat", () => ({ chat: { createGroup: jest.fn() } }));
jest.mock("@/features/membership", () => ({
  membership: { listMembersOfChapters: jest.fn() },
}));

const getChapterCountryId = chapters.getChapterCountryId as jest.Mock;
const createGroup = chat.createGroup as jest.Mock;
const listMembersOfChapters = membership.listMembersOfChapters as jest.Mock;

const VIEWER = "user-bo";
const MUENCHEN = "chapter-muenchen";

const access = (patch: Partial<Access> = {}): Access => ({
  role: null,
  countryAdminOf: [],
  memberships: [],
  ...patch,
});

const chapterMembers = (...userIds: string[]) =>
  listMembersOfChapters.mockResolvedValue(
    userIds.map((userId) => ({ userId, organizationId: MUENCHEN })),
  );

const create = (
  viewerAccess = access(),
  memberUserIds = ["user-anna", "user-cara"],
) =>
  createGroupChat({
    viewerUserId: VIEWER,
    viewerAccess,
    title: "Saturday crew",
    chapterId: MUENCHEN,
    memberUserIds,
  });

beforeEach(() => {
  jest.clearAllMocks();
  getChapterCountryId.mockResolvedValue("country-de");
  chapterMembers(VIEWER, "user-anna", "user-cara");
  createGroup.mockResolvedValue({ id: "conv-1" });
});

describe("createGroupChat", () => {
  it("opens the group and makes the creator its owner", async () => {
    await expect(create()).resolves.toEqual({ conversationId: "conv-1" });

    expect(createGroup).toHaveBeenCalledWith({
      title: "Saturday crew",
      chapterId: MUENCHEN,
      createdByUserId: VIEWER,
      memberUserIds: ["user-anna", "user-cara"],
    });
  });

  it("refuses a chapter that does not exist", async () => {
    getChapterCountryId.mockResolvedValue(null);

    await expect(create()).rejects.toThrow("unknownChapter");
    expect(createGroup).not.toHaveBeenCalled();
  });

  it("refuses a creator who does not belong to the chapter", async () => {
    chapterMembers("user-anna", "user-cara");

    await expect(create()).rejects.toThrow("notMember");
    expect(createGroup).not.toHaveBeenCalled();
  });

  it("lets a chapter admin open a group without being a member", async () => {
    chapterMembers("user-anna", "user-cara");

    await expect(
      create(
        access({ memberships: [{ chapterId: MUENCHEN, roles: ["admin"] }] }),
      ),
    ).resolves.toEqual({ conversationId: "conv-1" });
  });

  it("lets a country admin of the chapter's country open a group", async () => {
    chapterMembers("user-anna", "user-cara");

    await expect(
      create(access({ countryAdminOf: ["country-de"] })),
    ).resolves.toEqual({ conversationId: "conv-1" });
  });

  it("refuses a member who belongs to another chapter", async () => {
    await expect(
      create(access(), ["user-anna", "user-elsewhere"]),
    ).rejects.toThrow("notReachable");
    expect(createGroup).not.toHaveBeenCalled();
  });
});
