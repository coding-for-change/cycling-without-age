import { chat } from "@/features/chat";
import { profile } from "@/features/profile";
import type { ActiveScope, AdminScope, ScopeChapter } from "@/lib/access";
import {
  listConversationsInScope,
  readConversationAsAdmin,
} from "@/use-cases/chat/oversight";

jest.mock("@/features/chat", () => ({
  chat: {
    listConversationsInScope: jest.fn(),
    listMemberUserIds: jest.fn(),
    readConversationAsAdmin: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfiles: jest.fn() },
}));
jest.mock("@/lib/avatar", () => ({
  avatarSeed: (email: string) => email,
  avatarSvg: (seed: string) => `<svg>${seed}</svg>`,
}));

const listInScope = chat.listConversationsInScope as jest.Mock;
const listMemberUserIds = chat.listMemberUserIds as jest.Mock;
const readAsAdmin = chat.readConversationAsAdmin as jest.Mock;
const getProfiles = profile.getProfiles as jest.Mock;

const MUENCHEN: ScopeChapter = {
  id: "chapter-muenchen",
  slug: "muenchen",
  name: "München",
  countryId: "country-de",
};
const AARHUS: ScopeChapter = {
  id: "chapter-aarhus",
  slug: "aarhus",
  name: "Aarhus",
  countryId: "country-dk",
};

const scope = (patch: Partial<AdminScope> = {}): AdminScope => ({
  global: false,
  countries: [],
  chapters: [MUENCHEN],
  canSeeChapters: true,
  canSeeCountries: false,
  canCreateCountries: false,
  canDeleteAccounts: false,
  canSeeGlobalEvents: false,
  ...patch,
});

const all: ActiveScope = { kind: "all" };

const conversation = (chapterId: string | null) => ({
  id: "conv-1",
  kind: "group" as const,
  origin: "manual" as const,
  title: "Saturday crew",
  chapterId,
  announcementOnly: false,
  frozenAt: null,
  lastSeq: 2,
  lastMessageAt: "2026-09-17T10:00:00.000Z",
  otherUserId: null,
  memberCount: 3,
  lastMessage: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  listInScope.mockResolvedValue([]);
  listMemberUserIds.mockResolvedValue([]);
  getProfiles.mockResolvedValue([]);
  readAsAdmin.mockResolvedValue({
    conversation: conversation(MUENCHEN.id),
    members: [],
    messages: [],
  });
});

describe("listConversationsInScope", () => {
  it("reads every chapter only for a superadmin looking at everything", async () => {
    await listConversationsInScope(scope({ global: true }), all);

    expect(listInScope).toHaveBeenCalledWith({ chapterIds: "all" });
  });

  it("narrows a chapter admin to their own chapters", async () => {
    await listConversationsInScope(scope(), all);

    expect(listInScope).toHaveBeenCalledWith({ chapterIds: [MUENCHEN.id] });
  });

  it("narrows a superadmin who picked one chapter", async () => {
    await listConversationsInScope(scope({ global: true }), {
      kind: "chapter",
      chapter: AARHUS,
    });

    expect(listInScope).toHaveBeenCalledWith({ chapterIds: [AARHUS.id] });
  });

  it("reads nothing for an admin without a chapter", async () => {
    await listConversationsInScope(scope({ chapters: [] }), all);

    expect(listInScope).not.toHaveBeenCalled();
  });
});

describe("readConversationAsAdmin", () => {
  it("opens a conversation of a chapter in scope", async () => {
    await expect(
      readConversationAsAdmin(scope(), all, "conv-1"),
    ).resolves.toEqual(expect.objectContaining({ members: [], messages: [] }));
  });

  it("refuses a conversation of another chapter", async () => {
    readAsAdmin.mockResolvedValue({
      conversation: conversation(AARHUS.id),
      members: [],
      messages: [],
    });

    await expect(
      readConversationAsAdmin(scope(), all, "conv-1"),
    ).resolves.toBeNull();
  });

  it("refuses a chapter the admin left out of the active scope", async () => {
    await expect(
      readConversationAsAdmin(
        scope({ chapters: [MUENCHEN, AARHUS] }),
        {
          kind: "chapter",
          chapter: AARHUS,
        },
        "conv-1",
      ),
    ).resolves.toBeNull();
  });

  it("keeps a conversation without a chapter for superadmins only", async () => {
    readAsAdmin.mockResolvedValue({
      conversation: conversation(null),
      members: [],
      messages: [],
    });

    await expect(
      readConversationAsAdmin(scope(), all, "conv-1"),
    ).resolves.toBeNull();
    await expect(
      readConversationAsAdmin(scope({ global: true }), all, "conv-1"),
    ).resolves.not.toBeNull();
  });
});
