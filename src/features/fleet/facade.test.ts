import { fleet } from "@/features/fleet";
import { domainCode } from "@/lib/domain-error";
import { allowsAdmin, type Access } from "@/lib/access";
import * as damages from "./services/damages";
import * as files from "./services/files";
import * as locations from "./services/locations";
import * as log from "./services/log";
import * as memberships from "./services/memberships";
import * as trishaws from "./services/trishaws";
import * as types from "./services/types";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/lib/storage", () => ({
  prepareUpload: jest.fn(),
  commitUpload: jest.fn(),
}));

const emitted: unknown[] = [];
jest.mock("@/lib/events", () => ({
  transaction: jest.fn((run: (tx: unknown, emit: unknown) => unknown) =>
    run({}, async (event: unknown) => {
      emitted.push(event);
    }),
  ),
}));

jest.mock("./services/damages");
jest.mock("./services/files");
jest.mock("./services/locations", () => ({
  ...jest.requireActual("./services/locations"),
  findLocationById: jest.fn(),
  findPoolByCode: jest.fn(),
  insertLocation: jest.fn(),
  updateLocationById: jest.fn(),
  findLocations: jest.fn(),
  findDefaultLocation: jest.fn(),
  deleteLocationById: jest.fn(),
}));
jest.mock("./services/log");
jest.mock("./services/memberships");
jest.mock("./services/trishaws");
jest.mock("./services/types");

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock;

const DE = "country-de";
const DK = "country-dk";
const MUENCHEN = "chapter-muenchen";
const HAMBURG = "chapter-hamburg";

const access = (over: Partial<Access> = {}): Access => ({
  role: null,
  countryAdminOf: [],
  memberships: [],
  ...over,
});

const chapterAdmin = (chapterId: string) =>
  access({ memberships: [{ chapterId, roles: ["admin"] }] });

const pool = (over: Record<string, unknown> = {}) => ({
  id: "pool-1",
  kind: "pool",
  name: "Depot Sonnenhof",
  ownerChapterId: null,
  ownerChapter: null,
  countryId: DE,
  country: { id: DE, name: "Deutschland", code: "DE" },
  membersMayManage: false,
  isDefault: false,
  archivedAt: null,
  entrancePhotoFileId: null,
  chapters: [
    {
      id: "m-1",
      chapterId: HAMBURG,
      status: "approved",
      chapter: { id: HAMBURG, name: "Hamburg", countryId: DE },
    },
  ],
  _count: { trishaws: 1 },
  ...over,
});

const trishaw = (over: Record<string, unknown> = {}) => ({
  id: "trishaw-1",
  name: "Sonnenstrahl",
  status: "active",
  typeId: null,
  photoFileId: null,
  type: null,
  storageLocation: {
    id: "loc-muenchen",
    name: "München",
    kind: "chapter",
    ownerChapterId: MUENCHEN,
    countryId: null,
    membersMayManage: false,
    ownerChapter: { id: MUENCHEN, name: "München", countryId: DE },
    chapters: [],
  },
  damages: [],
  ...over,
});

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return null;
  } catch (error) {
    return domainCode(error);
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  emitted.length = 0;
});

describe("who may manage", () => {
  it("lets a pool's country admin manage it, and nobody from another country", async () => {
    mocked(locations.findLocationById).mockResolvedValue(pool());
    const authority = await fleet.locationAuthority("pool-1");
    expect(allowsAdmin(access({ countryAdminOf: [DE] }), authority)).toBe(true);
    expect(allowsAdmin(access({ countryAdminOf: [DK] }), authority)).toBe(
      false,
    );
    expect(allowsAdmin(chapterAdmin(HAMBURG), authority)).toBe(false);
  });

  it("hands a pool's trishaws to member admins only when the pool allows it", async () => {
    mocked(locations.findLocationById).mockResolvedValue(pool());
    expect(
      allowsAdmin(
        chapterAdmin(HAMBURG),
        await fleet.locationTrishawManagers("pool-1"),
      ),
    ).toBe(false);

    mocked(locations.findLocationById).mockResolvedValue(
      pool({ membersMayManage: true }),
    );
    expect(
      allowsAdmin(
        chapterAdmin(HAMBURG),
        await fleet.locationTrishawManagers("pool-1"),
      ),
    ).toBe(true);
    expect(
      allowsAdmin(
        chapterAdmin(MUENCHEN),
        await fleet.locationTrishawManagers("pool-1"),
      ),
    ).toBe(false);
  });

  it("never counts a pending member as a reader", async () => {
    mocked(locations.findLocationById).mockResolvedValue(
      pool({
        chapters: [
          {
            id: "m-2",
            chapterId: MUENCHEN,
            status: "pending",
            chapter: { id: MUENCHEN, name: "München", countryId: DE },
          },
        ],
      }),
    );
    expect(
      allowsAdmin(
        chapterAdmin(MUENCHEN),
        await fleet.locationReaders("pool-1"),
      ),
    ).toBe(false);
  });

  it("gives a chapter's own location to that chapter's admins and its country admins", async () => {
    mocked(locations.findLocationById).mockResolvedValue({
      ...pool(),
      kind: "chapter",
      ownerChapterId: MUENCHEN,
      ownerChapter: { id: MUENCHEN, name: "München", countryId: DE },
      countryId: null,
      chapters: [],
    });
    const authority = await fleet.locationAuthority("loc");
    expect(allowsAdmin(chapterAdmin(MUENCHEN), authority)).toBe(true);
    expect(allowsAdmin(access({ countryAdminOf: [DE] }), authority)).toBe(true);
    expect(allowsAdmin(chapterAdmin(HAMBURG), authority)).toBe(false);
  });
});

describe("type promotion", () => {
  it("widens chapter → country → global and stops there", () => {
    const base = { chapter: { countryId: DE } } as never;
    expect(
      fleet.promotionTarget({ ...(base as object), scope: "chapter" } as never),
    ).toEqual({ scope: "country", countryId: DE });
    expect(fleet.promotionTarget({ scope: "country" } as never)).toEqual({
      scope: "global",
    });
    expect(fleet.promotionTarget({ scope: "global" } as never)).toBeNull();
  });

  it("names a clash in the target catalogue", async () => {
    mocked(types.findTypeById).mockResolvedValue({
      id: "t",
      scope: "chapter",
      chapter: { countryId: DE },
    });
    const { Prisma } = jest.requireActual("@/generated/prisma");
    mocked(types.updateTypeById).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    expect(await codeOf(fleet.promoteType("t"))).toBe("typeNameTaken");
  });

  it("refuses to delete a model trishaws still use", async () => {
    mocked(types.findTypeById).mockResolvedValue({ _count: { trishaws: 2 } });
    expect(await codeOf(fleet.deleteType("t"))).toBe("typeInUse");
    expect(types.deleteTypeById).not.toHaveBeenCalled();
  });
});

describe("pool access", () => {
  const request = (code: string, countryId = DE) =>
    fleet.requestPoolAccess({
      code,
      chapterId: MUENCHEN,
      chapterCountryId: countryId,
      requestedByUserId: "user-1",
    });

  it("answers a malformed, unknown and foreign code the same way", async () => {
    expect(await codeOf(request("nope"))).toBe("unknownPool");
    mocked(locations.findPoolByCode).mockResolvedValue(null);
    expect(await codeOf(request("DE-ABCD-EF"))).toBe("unknownPool");
    mocked(locations.findPoolByCode).mockResolvedValue(pool());
    expect(await codeOf(request("DE-ABCD-EF", DK))).toBe("unknownPool");
    expect(memberships.upsertMembershipRequest).not.toHaveBeenCalled();
  });

  it("files a pending request and tells the country admins", async () => {
    mocked(locations.findPoolByCode).mockResolvedValue(pool());
    mocked(memberships.findMembership).mockResolvedValue(null);
    mocked(memberships.upsertMembershipRequest).mockResolvedValue({
      id: "m-9",
      status: "pending",
    });
    await request("de-abcd-ef");
    expect(locations.findPoolByCode).toHaveBeenCalledWith("DE-ABCD-EF");
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "pool.accessRequested",
        countryId: DE,
        chapterId: MUENCHEN,
      }),
    ]);
  });

  it("refuses a chapter that is already in", async () => {
    mocked(locations.findPoolByCode).mockResolvedValue(pool());
    mocked(memberships.findMembership).mockResolvedValue({
      status: "approved",
    });
    expect(await codeOf(request("DE-ABCD-EF"))).toBe("alreadyMember");
  });

  it("loses the race to a concurrent decision", async () => {
    mocked(memberships.findMembershipById).mockResolvedValue({
      id: "m-1",
      status: "pending",
      storageLocationId: "pool-1",
      chapterId: MUENCHEN,
    });
    mocked(memberships.setMembershipDecision).mockResolvedValue({ count: 0 });
    expect(
      await codeOf(
        fleet.decidePoolRequest(
          { membershipId: "m-1", approve: true },
          "admin",
        ),
      ),
    ).toBe("alreadyDecided");
    expect(emitted).toEqual([]);
  });

  it("keeps a chapter with upcoming rides in the pool", async () => {
    mocked(memberships.findMembership).mockResolvedValue({ id: "m-1" });
    expect(
      await codeOf(
        fleet.leavePool({
          poolId: "pool-1",
          chapterId: MUENCHEN,
          futureRideCount: 2,
        }),
      ),
    ).toBe("poolInUse");
    expect(memberships.deleteMembership).not.toHaveBeenCalled();
  });
});

describe("damage and status", () => {
  const report = (grounding: boolean) =>
    fleet.reportDamage({
      trishawId: "trishaw-1",
      description: "Flat rear tyre",
      grounding,
      reportedByUserId: "pilot-1",
      chapterId: MUENCHEN,
      affectedRideIds: ["ride-1"],
    });

  beforeEach(() => {
    mocked(damages.insertDamage).mockResolvedValue({ id: "damage-1" });
  });

  it("grounds an active trishaw and tells everyone about affected rides", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(trishaw());
    await report(true);
    expect(trishaws.updateTrishawById).toHaveBeenCalledWith(
      "trishaw-1",
      { status: "maintenance" },
      expect.anything(),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "trishaw.damageReported",
        grounding: true,
        affectedRideIds: ["ride-1"],
        reachingChapterIds: [MUENCHEN],
      }),
    ]);
  });

  it("leaves the status alone for a minor damage", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(trishaw());
    await report(false);
    expect(trishaws.updateTrishawById).not.toHaveBeenCalled();
    expect(emitted).toEqual([
      expect.objectContaining({ grounding: false, affectedRideIds: [] }),
    ]);
  });

  it("does not un-retire a retired trishaw by grounding it", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({ status: "retired" }),
    );
    await report(true);
    expect(trishaws.updateTrishawById).not.toHaveBeenCalled();
  });

  it("refuses a photo someone else uploaded", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(trishaw());
    mocked(files.findStoredFileById).mockResolvedValue({
      id: "file-1",
      kind: "damagePhoto",
      uploadedByUserId: "someone-else",
    });
    expect(
      await codeOf(
        fleet.reportDamage({
          trishawId: "trishaw-1",
          description: "Flat rear tyre",
          grounding: false,
          photoFileId: "file-1",
          reportedByUserId: "pilot-1",
          chapterId: MUENCHEN,
          affectedRideIds: [],
        }),
      ),
    ).toBe("invalidFile");
  });

  const clear = () =>
    fleet.clearDamages({ damageIds: ["damage-1"], note: "Fixed" }, "admin-1");

  it("returns the trishaw to service when the last grounding damage clears", async () => {
    mocked(damages.findDamageById).mockResolvedValue({
      id: "damage-1",
      trishawId: "trishaw-1",
      grounding: true,
    });
    mocked(damages.clearDamageById).mockResolvedValue({ count: 1 });
    mocked(damages.countOpenGroundingDamages).mockResolvedValue(0);
    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({ status: "maintenance" }),
    );
    await clear();
    expect(trishaws.updateTrishawById).toHaveBeenCalledWith(
      "trishaw-1",
      { status: "active" },
      expect.anything(),
    );
  });

  it("keeps it in the workshop while another grounding damage is open", async () => {
    mocked(damages.findDamageById).mockResolvedValue({
      id: "damage-1",
      trishawId: "trishaw-1",
      grounding: true,
    });
    mocked(damages.clearDamageById).mockResolvedValue({ count: 1 });
    mocked(damages.countOpenGroundingDamages).mockResolvedValue(1);
    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({ status: "maintenance" }),
    );
    await clear();
    expect(trishaws.updateTrishawById).not.toHaveBeenCalled();
    expect(log.insertLogEntry).toHaveBeenCalledWith(
      "trishaw-1",
      "admin-1",
      "damageCleared",
      { damageId: "damage-1", note: "Fixed" },
      expect.anything(),
    );
  });

  it("cannot clear the same damage twice", async () => {
    mocked(damages.findDamageById).mockResolvedValue({
      id: "damage-1",
      trishawId: "trishaw-1",
      grounding: true,
    });
    mocked(damages.clearDamageById).mockResolvedValue({ count: 0 });
    expect(await codeOf(clear())).toBe("alreadyCleared");
  });
});

describe("allocation", () => {
  it("lets a pool member use a pool trishaw, and nobody else", async () => {
    const pooled = trishaw({
      storageLocation: {
        ...trishaw().storageLocation,
        kind: "pool",
        ownerChapterId: null,
        chapters: [{ chapterId: HAMBURG, chapter: { countryId: DE } }],
      },
    });
    mocked(trishaws.findTrishawsByIds).mockResolvedValue([pooled]);
    await expect(
      fleet.assertUsable(["trishaw-1"], HAMBURG),
    ).resolves.toBeTruthy();
    expect(await codeOf(fleet.assertUsable(["trishaw-1"], MUENCHEN))).toBe(
      "trishawNotInChapter",
    );
  });

  it("refuses a trishaw that is in the workshop", async () => {
    mocked(trishaws.findTrishawsByIds).mockResolvedValue([
      trishaw({ status: "maintenance" }),
    ]);
    expect(await codeOf(fleet.assertUsable(["trishaw-1"], MUENCHEN))).toBe(
      "trishawUnavailable",
    );
  });

  it("refuses an unknown trishaw", async () => {
    mocked(trishaws.findTrishawsByIds).mockResolvedValue([]);
    expect(await codeOf(fleet.assertUsable(["nope"], MUENCHEN))).toBe(
      "unknownTrishaw",
    );
  });
});

describe("who may read a file", () => {
  const damagePhoto = {
    id: "file-1",
    kind: "damagePhoto",
    uploadedByUserId: "pilot-1",
    typePhotos: [],
    typeManuals: [],
    trishawPhotos: [],
    entrancePhotos: [],
    damagePhotos: [
      {
        reportedByUserId: "pilot-1",
        trishaw: { storageLocationId: "pool-1" },
      },
    ],
  };

  it("shows a damage photo to its reporter and the pool's admins only", async () => {
    mocked(files.findFileOwners).mockResolvedValue(damagePhoto);
    mocked(locations.findLocationById).mockResolvedValue(pool());
    expect(
      await fleet.readableFile("file-1", "pilot-1", access()),
    ).toBeTruthy();
    expect(
      await fleet.readableFile("file-1", "x", access({ countryAdminOf: [DE] })),
    ).toBeTruthy();
    expect(
      await fleet.readableFile("file-1", "x", chapterAdmin(HAMBURG)),
    ).toBeTruthy();
    expect(
      await fleet.readableFile(
        "file-1",
        "x",
        access({ memberships: [{ chapterId: HAMBURG, roles: ["pilot"] }] }),
      ),
    ).toBeNull();
    expect(
      await fleet.readableFile("file-1", "x", chapterAdmin(MUENCHEN)),
    ).toBeNull();
  });

  it("keeps an unattached upload private to its uploader", async () => {
    mocked(files.findFileOwners).mockResolvedValue({
      ...damagePhoto,
      kind: "entrancePhoto",
      damagePhotos: [],
    });
    expect(
      await fleet.readableFile("file-1", "pilot-1", access()),
    ).toBeTruthy();
    expect(await fleet.readableFile("file-1", "x", access())).toBeNull();
  });
});

describe("frame number", () => {
  it("can be filled in once and never changed", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({ frameNumber: "TB-1" }),
    );
    expect(
      await codeOf(fleet.updateTrishaw("trishaw-1", { frameNumber: "TB-2" })),
    ).toBe("frameNumberLocked");
    expect(trishaws.updateTrishawById).not.toHaveBeenCalled();

    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({ frameNumber: null }),
    );
    mocked(trishaws.updateTrishawById).mockResolvedValue(trishaw());
    await fleet.updateTrishaw("trishaw-1", { frameNumber: "TB-2" });
    expect(trishaws.updateTrishawById).toHaveBeenCalledWith("trishaw-1", {
      frameNumber: "TB-2",
    });
  });
});

describe("putting a grounded trishaw back into service", () => {
  it("goes through clearing the damage, not the status", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({
        status: "maintenance",
        damages: [{ id: "damage-1", grounding: true, reportedAt: new Date() }],
      }),
    );
    expect(
      await codeOf(fleet.setTrishawStatus("trishaw-1", "active", "a")),
    ).toBe("trishawGrounded");
    expect(trishaws.updateTrishawById).not.toHaveBeenCalled();
  });

  it("still lets a trishaw with no grounding damage leave the workshop", async () => {
    mocked(trishaws.findTrishawById).mockResolvedValue(
      trishaw({ status: "maintenance" }),
    );
    mocked(trishaws.updateTrishawById).mockResolvedValue(trishaw());
    await fleet.setTrishawStatus("trishaw-1", "active", "a");
    expect(trishaws.updateTrishawById).toHaveBeenCalledWith(
      "trishaw-1",
      { status: "active" },
      expect.anything(),
    );
  });

  it("refuses to clear damages of two different trishaws with one note", async () => {
    mocked(damages.findDamageById)
      .mockResolvedValueOnce({ id: "d1", trishawId: "t1", grounding: true })
      .mockResolvedValueOnce({ id: "d2", trishawId: "t2", grounding: true });
    expect(
      await codeOf(
        fleet.clearDamages({ damageIds: ["d1", "d2"], note: "Fixed" }, "a"),
      ),
    ).toBe("unknownDamage");
    expect(damages.clearDamageById).not.toHaveBeenCalled();
  });
});
