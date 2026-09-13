import { prisma } from "@/lib/prisma";
import { activity } from "@/lib/activity";
import { membership } from "@/features/membership";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    member: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  client.$transaction = jest.fn((run: (tx: unknown) => unknown) => run(client));
  return { prisma: client };
});
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));

const db = prisma as unknown as {
  member: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
};
const record = activity.record as jest.Mock;

const CHAPTER = "chapter-berlin";
const ACTOR = "admin-9";
const OTHER = "user-1";

beforeEach(() => {
  jest.clearAllMocks();
  db.member.findUnique.mockResolvedValue({ role: "admin,pilot" });
  // A second admin, so stepping down is allowed; covered in facade.test.ts.
  db.member.findMany.mockResolvedValue([{ role: "admin" }, { role: "admin" }]);
});

describe("changeMemberRole", () => {
  it("refuses to demote or remove the acting admin themselves", async () => {
    for (const change of ["demote", "remove"] as const) {
      await expect(
        membership.changeMemberRole({
          userId: ACTOR,
          chapterId: CHAPTER,
          actorUserId: ACTOR,
          change,
        }),
      ).rejects.toThrow("selfChange");
    }
    expect(db.member.upsert).not.toHaveBeenCalled();
    expect(db.member.deleteMany).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("lets an admin promote themselves no further, but not lock themselves out", async () => {
    await membership.changeMemberRole({
      userId: ACTOR,
      chapterId: CHAPTER,
      actorUserId: ACTOR,
      change: "promote",
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ type: "roleGranted" }),
    );
  });

  it.each([
    ["promote", "roleGranted"],
    ["demote", "roleRevoked"],
    ["remove", "memberRemoved"],
  ] as const)("records %s as %s", async (change, type) => {
    await membership.changeMemberRole({
      userId: OTHER,
      chapterId: CHAPTER,
      actorUserId: ACTOR,
      change,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OTHER,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type,
      }),
    );
  });
});
