import { allowsAdmin, isCountryAdmin, isSuperAdmin } from "@/lib/access";
import type {
  Access,
  ActiveScope,
  AdminAuthority,
  AdminScope,
} from "@/lib/access";
import { training } from "@/features/training";
import {
  deleteVideoAction,
  signVideoPartsAction,
  startVideoUploadAction,
  updateVideoAction,
  videoStatusesAction,
} from "./actions";

const CHAPTER_COUNTRY: Record<string, string> = {
  "chapter-berlin": "country-de",
  "chapter-aarhus": "country-dk",
};

let access: Access;
let adminScope: AdminScope;
let active: ActiveScope;
const session = () => ({ user: { id: "admin-1" }, access });

const DE = { id: "country-de", code: "DE", name: "Germany" };
const DK = { id: "country-dk", code: "DK", name: "Denmark" };
const BERLIN = {
  id: "chapter-berlin",
  slug: "berlin",
  name: "Berlin",
  countryId: "country-de",
};
const AARHUS = {
  id: "chapter-aarhus",
  slug: "aarhus",
  name: "Aarhus",
  countryId: "country-dk",
};

const scopeOf = (
  global: boolean,
  countries: AdminScope["countries"],
  chapters: AdminScope["chapters"],
): AdminScope => ({
  global,
  countries,
  chapters,
  canSeeChapters: true,
  canSeeCountries: global,
  canCreateCountries: global,
  canDeleteAccounts: global,
  canSeeGlobalEvents: global,
});

const forbidden = () => {
  throw new Error("FORBIDDEN");
};

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
  unstable_rethrow: jest.fn(),
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));
jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/storage", () => ({ withinUploadLimit: () => true }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminOf: jest.fn(async (authority: AdminAuthority) =>
    allowsAdmin(access, authority) ? session() : forbidden(),
  ),
  requireAdminScope: jest.fn(async () => ({
    session: session(),
    scope: adminScope,
  })),
  requireCatalogueOwner: jest.fn(
    async (
      owner:
        | { scope: "global" }
        | { scope: "country"; countryId: string }
        | { scope: "chapter"; chapterId: string },
    ) => {
      const ok =
        owner.scope === "global"
          ? isSuperAdmin(access)
          : owner.scope === "country"
            ? isCountryAdmin(access, owner.countryId)
            : allowsAdmin(access, {
                countryIds: [],
                chapters: [
                  {
                    chapterId: owner.chapterId,
                    countryId: CHAPTER_COUNTRY[owner.chapterId],
                  },
                ],
              });
      return ok ? session() : forbidden();
    },
  ),
}));
jest.mock("@/lib/admin-scope-cookie", () => ({
  ...jest.requireActual("@/lib/admin-scope-cookie"),
  storedActiveScope: jest.fn(async () => active),
}));
jest.mock("@/features/training", () => ({
  training: {
    createVideo: jest.fn(async () => ({
      videoId: "video-1",
      partSize: 1,
      partCount: 1,
    })),
    videoAuthority: jest.fn(),
    signParts: jest.fn(async () => []),
    updateVideo: jest.fn(),
    deleteVideo: jest.fn(),
    videoStatuses: jest.fn(),
  },
}));

const none: Access = { role: null, countryAdminOf: [], memberships: [] };
const berlinAdmin: Access = {
  ...none,
  memberships: [{ chapterId: "chapter-berlin", roles: ["admin"] }],
};
const germanyAdmin: Access = { ...none, countryAdminOf: ["country-de"] };

const berlinVideo: AdminAuthority = {
  chapters: [{ chapterId: "chapter-berlin", countryId: "country-de" }],
  countryIds: [],
};
const danishVideo: AdminAuthority = {
  chapters: [],
  countryIds: ["country-dk"],
};
const globalVideo: AdminAuthority = { chapters: [], countryIds: [] };

const start = (extra: Record<string, unknown> = {}) =>
  startVideoUploadAction({
    ...extra,
    language: "de",
    title: "Bremsen",
    mime: "video/mp4",
    size: 1024,
  });

const ownerUsed = () =>
  (training.createVideo as jest.Mock).mock.calls.at(-1)?.[0].owner;

const authorityIs = (authority: AdminAuthority) =>
  (training.videoAuthority as jest.Mock).mockResolvedValue(authority);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("a chapter admin of Berlin", () => {
  beforeEach(() => {
    access = berlinAdmin;
    adminScope = scopeOf(false, [], [BERLIN]);
    active = { kind: "chapter", chapter: BERLIN };
  });

  it("uploads into its own chapter, whatever owner the client sends", async () => {
    await expect(start()).resolves.toMatchObject({
      ok: true,
      videoId: "video-1",
    });
    expect(ownerUsed()).toEqual({
      scope: "chapter",
      chapterId: "chapter-berlin",
    });
    await expect(start({ owner: { scope: "global" } })).resolves.toMatchObject({
      ok: true,
    });
    expect(ownerUsed()).toEqual({
      scope: "chapter",
      chapterId: "chapter-berlin",
    });
  });

  it("can't upload into a chapter outside its scope", async () => {
    await expect(start({ scope: "chapter:aarhus" })).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(training.createVideo).not.toHaveBeenCalled();
  });

  it("cannot edit, sign parts for or delete a global or country video", async () => {
    for (const authority of [globalVideo, danishVideo]) {
      authorityIs(authority);
      await expect(
        updateVideoAction("video-1", { title: "Hijack" }),
      ).resolves.toEqual({ ok: false, error: "generic" });
      await expect(
        signVideoPartsAction({ videoId: "video-1", partNumbers: [1] }),
      ).resolves.toEqual({ ok: false, error: "generic" });
      await expect(deleteVideoAction("video-1")).resolves.toEqual({
        ok: false,
        error: "generic",
      });
    }
    expect(training.updateVideo).not.toHaveBeenCalled();
    expect(training.signParts).not.toHaveBeenCalled();
    expect(training.deleteVideo).not.toHaveBeenCalled();
  });

  it("edits its own chapter's video", async () => {
    authorityIs(berlinVideo);
    await expect(
      updateVideoAction("video-1", { title: "Bremsen richtig" }),
    ).resolves.toEqual({ ok: true });
  });

  it("only sees the processing state of videos it manages", async () => {
    (training.videoStatuses as jest.Mock).mockResolvedValue([
      { id: "mine", status: "processing", authority: berlinVideo },
      { id: "theirs", status: "processing", authority: danishVideo },
      { id: "global", status: "ready", authority: globalVideo },
    ]);
    const result = await videoStatusesAction(["mine", "theirs", "global"]);
    expect(result).toEqual({
      ok: true,
      videos: [{ id: "mine", status: "processing" }],
    });
  });
});

describe("a country admin of Germany", () => {
  beforeEach(() => {
    access = germanyAdmin;
    adminScope = scopeOf(false, [DE], [BERLIN]);
    active = { kind: "country", country: DE };
  });

  it("uploads into Germany, also while looking at a German chapter", async () => {
    await expect(start()).resolves.toMatchObject({ ok: true });
    expect(ownerUsed()).toEqual({ scope: "country", countryId: "country-de" });
    await expect(start({ scope: "chapter:berlin" })).resolves.toMatchObject({
      ok: true,
    });
    expect(ownerUsed()).toEqual({ scope: "country", countryId: "country-de" });
  });

  it("can't pick Denmark as the active scope", async () => {
    await expect(start({ scope: "country:DK" })).rejects.toThrow("FORBIDDEN");
    expect(training.createVideo).not.toHaveBeenCalled();
  });

  it("cannot delete another country's video", async () => {
    authorityIs(danishVideo);
    await expect(deleteVideoAction("video-1")).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(training.deleteVideo).not.toHaveBeenCalled();
  });
});

describe("a country admin of two countries", () => {
  beforeEach(() => {
    access = { ...none, countryAdminOf: ["country-de", "country-dk"] };
    adminScope = scopeOf(false, [DE, DK], [BERLIN, AARHUS]);
    active = { kind: "all" };
  });

  it("must pick a country before uploading", async () => {
    await expect(start({ scope: "all" })).resolves.toEqual({
      ok: false,
      error: "scopeAmbiguous",
    });
    expect(training.createVideo).not.toHaveBeenCalled();
  });
});

describe("a superadmin", () => {
  beforeEach(() => {
    access = { ...none, role: "superadmin" };
    adminScope = scopeOf(true, [DE, DK], [BERLIN, AARHUS]);
    active = { kind: "chapter", chapter: AARHUS };
  });

  it("always uploads into the global library", async () => {
    await expect(start()).resolves.toMatchObject({ ok: true });
    expect(ownerUsed()).toEqual({ scope: "global" });
    await expect(start({ scope: "country:DE" })).resolves.toMatchObject({
      ok: true,
    });
    expect(ownerUsed()).toEqual({ scope: "global" });
  });
});

describe("input validation", () => {
  beforeEach(() => {
    access = { ...none, role: "superadmin" };
    adminScope = scopeOf(true, [], []);
    active = { kind: "all" };
  });

  it("refuses a file type outside the video allowlist", async () => {
    await expect(
      startVideoUploadAction({
        language: "en",
        title: "x",
        mime: "application/x-msdownload",
        size: 10,
      }),
    ).resolves.toEqual({ ok: false, error: "generic" });
    expect(training.createVideo).not.toHaveBeenCalled();
  });
});
