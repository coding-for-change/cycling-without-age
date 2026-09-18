import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import type { Access } from "@/lib/access";
import {
  lookupContact,
  searchPeople,
  startDirectChat,
  startDirectChatWithUser,
} from "@/use-cases/chat/start-direct-chat";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapterCountryId: jest.fn(),
    getChapters: jest.fn(),
    listChapters: jest.fn(),
  },
}));
jest.mock("@/features/chat", () => ({
  chat: { getOrCreateDirect: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(),
    searchMembersByName: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({
  profile: {
    getProfile: jest.fn(),
    getUserIdByEmail: jest.fn(),
    getUserIdByPhone: jest.fn(),
    searchProfilesByName: jest.fn(),
  },
}));

const getChapterCountryId = chapters.getChapterCountryId as jest.Mock;
const getChapters = chapters.getChapters as jest.Mock;
const listChapters = chapters.listChapters as jest.Mock;
const searchMembersByName = membership.searchMembersByName as jest.Mock;
const searchProfilesByName = profile.searchProfilesByName as jest.Mock;
const getOrCreateDirect = chat.getOrCreateDirect as jest.Mock;
const listMembershipsOfUser = membership.listMembershipsOfUser as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getUserIdByEmail = profile.getUserIdByEmail as jest.Mock;
const getUserIdByPhone = profile.getUserIdByPhone as jest.Mock;

const VIEWER = "user-bo";
const TARGET = "user-anna";
const MUENCHEN = "chapter-muenchen";
const AARHUS = "chapter-aarhus";

const access = (patch: Partial<Access> = {}): Access => ({
  role: null,
  countryAdminOf: [],
  memberships: [],
  ...patch,
});

const memberships = (viewer: string[], target: string[]) =>
  listMembershipsOfUser.mockImplementation(async (userId: string) =>
    (userId === VIEWER ? viewer : target).map((chapterId) => ({
      chapterId,
      roles: ["pilot"],
    })),
  );

const lookup = (viewerAccess = access()) =>
  lookupContact({
    viewerUserId: VIEWER,
    viewerAccess,
    contact: "anna@example.com",
  });

beforeEach(() => {
  jest.clearAllMocks();
  getUserIdByEmail.mockResolvedValue(TARGET);
  getUserIdByPhone.mockResolvedValue(TARGET);
  getProfile.mockResolvedValue({
    name: "Anna Berg",
    email: "anna@example.com",
  });
  memberships([MUENCHEN], [MUENCHEN]);
  getChapterCountryId.mockResolvedValue("country-de");
  getOrCreateDirect.mockResolvedValue({
    conversation: { id: "conv-1" },
    created: true,
  });
  getChapters.mockImplementation(async (ids: string[]) =>
    ids.map((id) => ({ id, name: `Chapter ${id}` })),
  );
  listChapters.mockResolvedValue([]);
  searchMembersByName.mockResolvedValue([]);
  searchProfilesByName.mockResolvedValue([]);
});

describe("lookupContact", () => {
  it("finds someone from the same chapter by email", async () => {
    await expect(lookup()).resolves.toEqual({
      userId: TARGET,
      name: "Anna Berg",
      email: "anna@example.com",
    });
    expect(getUserIdByEmail).toHaveBeenCalledWith("anna@example.com");
  });

  it("looks a phone number up as a phone number", async () => {
    await lookupContact({
      viewerUserId: VIEWER,
      viewerAccess: access(),
      contact: "+4915112345678",
    });

    expect(getUserIdByPhone).toHaveBeenCalledWith("+4915112345678");
    expect(getUserIdByEmail).not.toHaveBeenCalled();
  });

  it("refuses an address nobody uses", async () => {
    getUserIdByEmail.mockResolvedValue(null);

    await expect(lookup()).rejects.toThrow("notFound");
  });

  it("refuses something that is neither an address nor a number", async () => {
    await expect(
      lookupContact({
        viewerUserId: VIEWER,
        viewerAccess: access(),
        contact: "anna",
      }),
    ).rejects.toThrow("notFound");
    expect(getUserIdByEmail).not.toHaveBeenCalled();
  });

  it("refuses the viewer's own address", async () => {
    getUserIdByEmail.mockResolvedValue(VIEWER);

    await expect(lookup()).rejects.toThrow("self");
  });

  it("tells a member nothing more than that nobody was found", async () => {
    memberships([MUENCHEN], [AARHUS]);

    await expect(lookup()).rejects.toThrow("notFound");
  });

  it("answers a member the same way whether or not the account exists", async () => {
    memberships([MUENCHEN], [AARHUS]);
    const outOfReach = await lookup().catch((error: Error) => error.message);

    getUserIdByEmail.mockResolvedValue(null);
    const unknown = await lookup().catch((error: Error) => error.message);

    expect(outOfReach).toBe(unknown);
  });

  it("lets a superadmin reach anyone", async () => {
    memberships([], [AARHUS]);

    await expect(lookup(access({ role: "superadmin" }))).resolves.toEqual(
      expect.objectContaining({ userId: TARGET }),
    );
  });

  it("lets a chapter admin reach a member of their chapter", async () => {
    memberships([], [AARHUS]);

    await expect(
      lookup(
        access({ memberships: [{ chapterId: AARHUS, roles: ["admin"] }] }),
      ),
    ).resolves.toEqual(expect.objectContaining({ userId: TARGET }));
  });

  it("lets a country admin reach a member of a chapter in their country", async () => {
    memberships([], [AARHUS]);
    getChapterCountryId.mockResolvedValue("country-dk");

    await expect(
      lookup(access({ countryAdminOf: ["country-dk"] })),
    ).resolves.toEqual(expect.objectContaining({ userId: TARGET }));
  });

  it("tells an admin that the account is out of their reach", async () => {
    memberships([], [AARHUS]);

    await expect(
      lookup(
        access({ memberships: [{ chapterId: MUENCHEN, roles: ["admin"] }] }),
      ),
    ).rejects.toThrow("notReachable");
  });

  it("refuses a country admin whose country is elsewhere", async () => {
    memberships([], [AARHUS]);
    getChapterCountryId.mockResolvedValue("country-dk");

    await expect(
      lookup(access({ countryAdminOf: ["country-de"] })),
    ).rejects.toThrow("notReachable");
  });

  it("does not ask for countries when the viewer administers none", async () => {
    memberships([], [AARHUS]);

    await expect(lookup()).rejects.toThrow("notFound");
    expect(getChapterCountryId).not.toHaveBeenCalled();
  });
});

describe("startDirectChat", () => {
  const start = (viewerAccess = access()) =>
    startDirectChat({
      viewerUserId: VIEWER,
      viewerAccess,
      contact: "anna@example.com",
    });

  it("files the conversation under the chapter both share", async () => {
    await expect(start()).resolves.toEqual({ conversationId: "conv-1" });

    expect(getOrCreateDirect).toHaveBeenCalledWith({
      userIds: [VIEWER, TARGET],
      chapterId: MUENCHEN,
      createdByUserId: VIEWER,
    });
  });

  it("takes the first shared chapter when there are several", async () => {
    memberships([AARHUS, MUENCHEN], [MUENCHEN, AARHUS]);

    await start();

    expect(getOrCreateDirect).toHaveBeenCalledWith(
      expect.objectContaining({ chapterId: MUENCHEN }),
    );
  });

  it("stores no chapter for an admin reaching across chapters", async () => {
    memberships([], [AARHUS]);

    await start(access({ role: "superadmin" }));

    expect(getOrCreateDirect).toHaveBeenCalledWith(
      expect.objectContaining({ chapterId: null }),
    );
  });

  it("does not open a conversation with someone out of reach", async () => {
    memberships([MUENCHEN], [AARHUS]);

    await expect(start()).rejects.toThrow("notFound");
    expect(getOrCreateDirect).not.toHaveBeenCalled();
  });
});

describe("searchPeople", () => {
  const search = (query: string, viewerAccess = access()) =>
    searchPeople({ viewerUserId: VIEWER, viewerAccess, query });

  it("searches names inside the viewer's own chapters and leaves the viewer out", async () => {
    searchMembersByName.mockResolvedValue([
      {
        userId: TARGET,
        name: "Anna Berg",
        email: "anna@example.com",
        chapterId: MUENCHEN,
      },
    ]);

    await expect(search("An")).resolves.toEqual([
      {
        userId: TARGET,
        name: "Anna Berg",
        email: "anna@example.com",
        chapterId: MUENCHEN,
        chapterName: `Chapter ${MUENCHEN}`,
      },
    ]);
    expect(searchMembersByName).toHaveBeenCalledWith([MUENCHEN], "An", {
      limit: 5,
      excludeUserId: VIEWER,
    });
  });

  it("asks for nothing below two characters", async () => {
    await expect(search("A")).resolves.toEqual([]);
    expect(searchMembersByName).not.toHaveBeenCalled();
  });

  it("widens a country admin's search to every chapter of their countries", async () => {
    listChapters.mockResolvedValue([{ id: AARHUS, name: "Aarhus" }]);

    await search("Ann", access({ countryAdminOf: ["country-dk"] }));

    expect(listChapters).toHaveBeenCalledWith("country-dk");
    expect(searchMembersByName).toHaveBeenCalledWith(
      [MUENCHEN, AARHUS],
      "Ann",
      expect.anything(),
    );
  });

  it("lets a superadmin search every account", async () => {
    searchProfilesByName.mockResolvedValue([
      { id: TARGET, name: "Anna Berg", email: "anna@example.com" },
    ]);

    await expect(
      search("Ann", access({ role: "superadmin" })),
    ).resolves.toEqual([
      expect.objectContaining({ userId: TARGET, chapterId: null }),
    ]);
    expect(searchMembersByName).not.toHaveBeenCalled();
  });

  it("treats an email as an exact lookup", async () => {
    await expect(search("anna@example.com")).resolves.toEqual([
      expect.objectContaining({ userId: TARGET, chapterId: MUENCHEN }),
    ]);
    expect(searchMembersByName).not.toHaveBeenCalled();
  });

  it("answers an out-of-reach address with an empty list", async () => {
    memberships([MUENCHEN], [AARHUS]);

    await expect(search("anna@example.com")).resolves.toEqual([]);
  });
});

describe("startDirectChatWithUser", () => {
  const start = (viewerAccess = access()) =>
    startDirectChatWithUser({
      viewerUserId: VIEWER,
      viewerAccess,
      targetUserId: TARGET,
    });

  it("files the conversation under the chapter both share", async () => {
    await expect(start()).resolves.toEqual({ conversationId: "conv-1" });

    expect(getOrCreateDirect).toHaveBeenCalledWith({
      userIds: [VIEWER, TARGET],
      chapterId: MUENCHEN,
      createdByUserId: VIEWER,
    });
  });

  it("refuses the viewer themselves", async () => {
    await expect(
      startDirectChatWithUser({
        viewerUserId: VIEWER,
        viewerAccess: access(),
        targetUserId: VIEWER,
      }),
    ).rejects.toThrow("self");
  });

  it("re-checks reach on the server whatever the client picked", async () => {
    memberships([MUENCHEN], [AARHUS]);

    await expect(start()).rejects.toThrow("notFound");
    expect(getOrCreateDirect).not.toHaveBeenCalled();
  });

  it("refuses an account that no longer exists", async () => {
    getProfile.mockResolvedValue(null);

    await expect(start()).rejects.toThrow("notFound");
  });
});
