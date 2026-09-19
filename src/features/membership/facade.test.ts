import { prisma } from "@/lib/prisma";
import { membership } from "@/features/membership";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    member: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    chapterApplication: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    event: { create: jest.fn(async () => ({ id: "event-1" })) },
    $queryRaw: jest.fn(),
  };
  client.$transaction = jest.fn((run: (tx: unknown) => unknown) => run(client));
  return { prisma: client };
});

jest.mock("@/lib/events/queues", () => ({
  QUEUE: {
    events: "events",
    handlers: "handlers",
    email: "email",
    push: "push",
  },
  queue: () => ({
    add: jest.fn(async () => ({})),
    addBulk: jest.fn(async () => []),
  }),
}));

const db = prisma as unknown as {
  member: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
  chapterApplication: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    updateMany: jest.Mock;
  };
  event: { create: jest.Mock };
  $queryRaw: jest.Mock;
};

const USER = "user-1";
const CHAPTER = "chapter-berlin";
const ADMIN = "admin-9";

const memberRow = (role: string | null) =>
  db.member.findUnique.mockResolvedValue(role === null ? null : { role });

const roleWritten = () => db.member.upsert.mock.calls[0][0].update.role;

const admins = (count: number) =>
  db.member.findMany.mockResolvedValue(
    Array.from({ length: count }, () => ({ role: "admin" })),
  );

const emitted = (type: string) =>
  db.event.create.mock.calls
    .map(([args]) => args.data)
    .filter((data: { type: string }) => data.type === type);

beforeEach(() => {
  jest.clearAllMocks();
  admins(2);
  db.chapterApplication.updateMany.mockResolvedValue({ count: 1 });
  db.chapterApplication.upsert.mockResolvedValue({ id: "app-1" });
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

  it("announces a passenger once, and not again on a repeat join", async () => {
    memberRow(null);
    await membership.joinAsPassenger(USER, CHAPTER, ADMIN);
    expect(emitted("chapter.memberJoined")).toEqual([
      expect.objectContaining({
        chapterId: CHAPTER,
        actorUserId: ADMIN,
        payload: expect.objectContaining({ userId: USER }),
      }),
    ]);

    db.event.create.mockClear();
    memberRow("passenger");
    await membership.joinAsPassenger(USER, CHAPTER, ADMIN);
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("has no actor when someone joins on their own", async () => {
    memberRow(null);
    await membership.joinAsPassenger(USER, CHAPTER);
    expect(emitted("chapter.memberJoined")[0].actorUserId).toBeNull();
  });

  it("keeps existing roles when granting another", async () => {
    memberRow("passenger");
    await membership.grantChapterRole(USER, CHAPTER, "pilot");
    expect(roleWritten()).toBe("passenger,pilot");
  });

  it("cannot grant a role that is not a chapter role", () => {
    memberRow("passenger");
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

describe("the last admin of a chapter", () => {
  it("cannot be demoted", async () => {
    memberRow("admin");
    admins(1);
    await expect(
      membership.revokeChapterRole(USER, CHAPTER, "admin"),
    ).rejects.toThrow("lastAdmin");
    expect(db.member.upsert).not.toHaveBeenCalled();
    expect(db.member.deleteMany).not.toHaveBeenCalled();
  });

  it("cannot be removed from the chapter", async () => {
    memberRow("admin,pilot");
    admins(1);
    await expect(membership.removeFromChapter(USER, CHAPTER)).rejects.toThrow(
      "lastAdmin",
    );
    expect(db.member.deleteMany).not.toHaveBeenCalled();
  });

  it("may step down once a second admin exists", async () => {
    memberRow("admin,pilot");
    admins(2);
    await membership.revokeChapterRole(USER, CHAPTER, "admin");
    expect(roleWritten()).toBe("pilot");
  });

  it("is counted behind a chapter lock taken before the write", async () => {
    memberRow("admin,pilot");
    await membership.revokeChapterRole(USER, CHAPTER, "admin");
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.member.findMany.mock.invocationCallOrder[0],
    );
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.member.upsert.mock.invocationCallOrder[0],
    );
  });
});

describe("promotion to chapter admin", () => {
  it("cannot promote someone who is not a member of the chapter", async () => {
    memberRow(null);
    await expect(
      membership.promoteToChapterAdmin(USER, CHAPTER),
    ).rejects.toThrow("notChapterMember");
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

  it("announces the application on the same transaction as the write", async () => {
    memberRow("passenger");
    await membership.applyAsPilot({ userId: USER, chapterId: CHAPTER });
    expect(emitted("pilotApplication.submitted")).toEqual([
      expect.objectContaining({
        chapterId: CHAPTER,
        actorUserId: USER,
        payload: expect.objectContaining({
          applicationId: "app-1",
          userId: USER,
        }),
      }),
    ]);
  });

  it("cannot apply when already a pilot of that chapter", async () => {
    memberRow("pilot");
    await expect(
      membership.applyAsPilot({ userId: USER, chapterId: CHAPTER }),
    ).rejects.toThrow("alreadyPilot");
    expect(db.chapterApplication.upsert).not.toHaveBeenCalled();
    expect(db.event.create).not.toHaveBeenCalled();
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

  const decide = (approve: boolean, note?: string) =>
    membership.decideApplication({
      applicationId: "app-1",
      decidedByUserId: ADMIN,
      approve,
      note,
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

  it("writes the event on the same transaction client as the decision", async () => {
    application();
    memberRow("passenger");
    await decide(true, "Bring your own helmet.");

    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "pilotApplication.decided",
          chapterId: CHAPTER,
          actorUserId: ADMIN,
          payload: expect.objectContaining({
            userId: USER,
            approved: true,
            note: "Bring your own helmet.",
          }),
        }),
      }),
    );
  });

  it("writes no event when the decision is refused", async () => {
    application();
    memberRow("passenger");
    db.chapterApplication.updateMany.mockResolvedValue({ count: 0 });
    await expect(decide(true)).rejects.toThrow("alreadyDecided");
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("grants nothing when another admin decided first", async () => {
    application();
    memberRow("passenger");
    db.chapterApplication.updateMany.mockResolvedValue({ count: 0 });
    await expect(decide(true)).rejects.toThrow("alreadyDecided");
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
    await expect(decide(true)).rejects.toThrow("adminNotApplied");
    expect(db.member.upsert).not.toHaveBeenCalled();
    expect(db.chapterApplication.updateMany).not.toHaveBeenCalled();
  });

  it("cannot decide an application twice", async () => {
    application({ status: "approved" });
    await expect(decide(true)).rejects.toThrow("alreadyDecided");
    application({ status: "rejected" });
    await expect(decide(true)).rejects.toThrow("alreadyDecided");
    expect(db.member.upsert).not.toHaveBeenCalled();
  });

  it("cannot decide an application that does not exist", async () => {
    db.chapterApplication.findUnique.mockResolvedValue(null);
    await expect(decide(true)).rejects.toThrow("unknownApplication");
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

  it("keeps the decider's note with the decision", async () => {
    application();
    await decide(false, "Come back after the summer training");
    expect(db.chapterApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionNote: "Come back after the summer training",
        }),
      }),
    );
  });
});

describe("inviting a member", () => {
  it("grants the roles and announces the invitation together", async () => {
    memberRow(null);
    await membership.inviteMember({
      userId: USER,
      chapterId: CHAPTER,
      actorUserId: ADMIN,
      roles: ["pilot", "admin"],
    });

    expect(roleWritten()).toBe("pilot,admin");
    expect(emitted("member.invited")).toEqual([
      expect.objectContaining({
        chapterId: CHAPTER,
        actorUserId: ADMIN,
        payload: expect.objectContaining({
          userId: USER,
          roles: ["pilot", "admin"],
        }),
      }),
    ]);
  });

  it("refuses a role that is not a chapter role", () => {
    expect(() =>
      membership.inviteMember({
        userId: USER,
        chapterId: CHAPTER,
        actorUserId: ADMIN,
        roles: ["superadmin" as never],
      }),
    ).toThrow();
    expect(db.member.upsert).not.toHaveBeenCalled();
  });
});

describe("acknowledging an approval", () => {
  it("reports whether anything was actually stamped", async () => {
    db.chapterApplication.updateMany.mockResolvedValue({ count: 0 });
    expect(await membership.markApprovalsSeen(USER)).toBe(false);
    db.chapterApplication.updateMany.mockResolvedValue({ count: 1 });
    expect(await membership.markApprovalsSeen(USER)).toBe(true);
  });
});
