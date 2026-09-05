import { prisma } from "@/lib/prisma";
import { membership } from "@/features/membership";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    member: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    chapterApplication: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const db = prisma as unknown as {
  member: { findUnique: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
  chapterApplication: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    updateMany: jest.Mock;
  };
};

const USER = "user-1";
const CHAPTER = "chapter-berlin";
const ADMIN = "admin-9";

// null = not a member of the chapter.
const memberRow = (role: string | null) =>
  db.member.findUnique.mockResolvedValue(role === null ? null : { role });

const roleWritten = () => db.member.upsert.mock.calls[0][0].update.role;

beforeEach(() => {
  jest.clearAllMocks();
  db.chapterApplication.updateMany.mockResolvedValue({ count: 1 });
});

describe("joining and role stacking", () => {
  it("adds a passenger straight away, no application", async () => {
    memberRow(null);
    await membership.joinAsPassenger(USER, CHAPTER);
    expect(roleWritten()).toBe("passenger");
  });

  it("does not duplicate a role when joining twice", async () => {
    memberRow("passenger");
    await membership.joinAsPassenger(USER, CHAPTER);
    expect(roleWritten()).toBe("passenger");
  });

  it("keeps existing roles when granting another", async () => {
    memberRow("passenger");
    await membership.grantChapterRole(USER, CHAPTER, "pilot");
    expect(roleWritten()).toBe("passenger,pilot");
  });

  it("cannot grant a role that is not a chapter role", () => {
    memberRow("passenger");
    // Rejected by the schema before any await, so it never reaches the DB.
    expect(() =>
      membership.grantChapterRole(USER, CHAPTER, "superadmin" as never),
    ).toThrow();
    expect(() =>
      membership.revokeChapterRole(USER, CHAPTER, "owner" as never),
    ).toThrow();
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("reads back only the roles the DB string actually contains", async () => {
    memberRow("admin,owner");
    expect(await membership.getMemberRoles(USER, CHAPTER)).toEqual(["admin"]);
  });

  it("reports no roles for a non-member", async () => {
    memberRow(null);
    expect(await membership.getMemberRoles(USER, CHAPTER)).toEqual([]);
  });
});

describe("revoking", () => {
  it("keeps the member row when other roles remain", async () => {
    memberRow("admin,pilot");
    await membership.revokeChapterRole(USER, CHAPTER, "admin");
    expect(roleWritten()).toBe("pilot");
    expect(db.member.deleteMany).not.toHaveBeenCalled();
  });

  it("removes the member entirely when the last role goes", async () => {
    memberRow("pilot");
    await membership.revokeChapterRole(USER, CHAPTER, "pilot");
    expect(db.member.deleteMany).toHaveBeenCalled();
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("does not touch the other roles when revoking one they never had", async () => {
    memberRow("passenger");
    await membership.revokeChapterRole(USER, CHAPTER, "admin");
    expect(roleWritten()).toBe("passenger");
  });
});

describe("promotion to chapter admin", () => {
  it("cannot promote someone who is not a member of the chapter", async () => {
    memberRow(null);
    await expect(
      membership.promoteToChapterAdmin(USER, CHAPTER),
    ).rejects.toThrow("Not a chapter member");
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("promotes a member without dropping their riding role", async () => {
    memberRow("pilot");
    await membership.promoteToChapterAdmin(USER, CHAPTER);
    expect(roleWritten()).toBe("pilot,admin");
  });
});

describe("applying as a pilot", () => {
  it("opens a pending application for a passenger", async () => {
    memberRow("passenger");
    await membership.applyAsPilot({ userId: USER, chapterId: CHAPTER });
    expect(db.chapterApplication.upsert).toHaveBeenCalled();
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("cannot apply when already a pilot of that chapter", async () => {
    memberRow("pilot");
    await expect(
      membership.applyAsPilot({ userId: USER, chapterId: CHAPTER }),
    ).rejects.toThrow("Already a pilot of this chapter");
    expect(db.chapterApplication.upsert).not.toHaveBeenCalled();
  });

  it("cannot apply without a user or a chapter", async () => {
    await expect(
      membership.applyAsPilot({ userId: "", chapterId: CHAPTER }),
    ).rejects.toThrow();
    await expect(
      membership.applyAsPilot({ userId: USER, chapterId: "" }),
    ).rejects.toThrow();
    expect(db.chapterApplication.upsert).not.toHaveBeenCalled();
  });

  it("cannot smuggle an oversized message past the schema", async () => {
    memberRow(null);
    await expect(
      membership.applyAsPilot({
        userId: USER,
        chapterId: CHAPTER,
        message: "x".repeat(1001),
      }),
    ).rejects.toThrow();
    expect(db.chapterApplication.upsert).not.toHaveBeenCalled();
  });
});

describe("deciding an application", () => {
  const application = (over: Record<string, unknown> = {}) =>
    db.chapterApplication.findUnique.mockResolvedValue({
      id: "app-1",
      userId: USER,
      chapterId: CHAPTER,
      role: "pilot",
      status: "pending",
      ...over,
    });

  const decide = (approve: boolean) =>
    membership.decideApplication({
      applicationId: "app-1",
      decidedByUserId: ADMIN,
      approve,
    });

  it("grants the role and records who decided", async () => {
    application();
    memberRow("passenger");
    await decide(true);
    expect(roleWritten()).toBe("passenger,pilot");
    expect(db.chapterApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-1", status: "pending" },
        data: expect.objectContaining({
          status: "approved",
          decidedByUserId: ADMIN,
        }),
      }),
    );
  });

  it("grants nothing when another admin decided first", async () => {
    application();
    memberRow("passenger");
    db.chapterApplication.updateMany.mockResolvedValue({ count: 0 });
    await expect(decide(true)).rejects.toThrow("Application already decided");
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("grants nothing on rejection", async () => {
    application();
    await decide(false);
    expect(db.member.upsert).not.toHaveBeenCalled();
    expect(db.chapterApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "rejected" }),
      }),
    );
  });

  it("cannot become chapter admin through an application", async () => {
    application({ role: "admin" });
    await expect(decide(true)).rejects.toThrow("Admin is not applied for");
    expect(db.member.upsert).not.toHaveBeenCalled();
    expect(db.chapterApplication.updateMany).not.toHaveBeenCalled();
  });

  it("cannot decide an application twice", async () => {
    application({ status: "approved" });
    await expect(decide(true)).rejects.toThrow("Application already decided");
    application({ status: "rejected" });
    await expect(decide(true)).rejects.toThrow("Application already decided");
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("cannot decide an application that does not exist", async () => {
    db.chapterApplication.findUnique.mockResolvedValue(null);
    await expect(decide(true)).rejects.toThrow("Unknown application");
    expect(db.chapterApplication.updateMany).not.toHaveBeenCalled();
  });

  it("cannot decide anonymously", async () => {
    await expect(
      membership.decideApplication({
        applicationId: "app-1",
        decidedByUserId: "",
        approve: true,
      }),
    ).rejects.toThrow();
    expect(db.chapterApplication.findUnique).not.toHaveBeenCalled();
  });
});
