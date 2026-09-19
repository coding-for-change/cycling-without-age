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
  event: { create: jest.Mock };
};

const CHAPTER = "chapter-berlin";
const ACTOR = "admin-9";
const OTHER = "user-1";

const emitted = () => db.event.create.mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  db.member.findUnique.mockResolvedValue({ role: "admin,pilot" });
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
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("lets an admin promote themselves no further, but not lock themselves out", async () => {
    await membership.changeMemberRole({
      userId: ACTOR,
      chapterId: CHAPTER,
      actorUserId: ACTOR,
      change: "promote",
    });
    expect(emitted().payload).toMatchObject({ change: "promote" });
  });

  it.each(["promote", "demote", "remove"] as const)(
    "emits %s against subject, actor and chapter",
    async (change) => {
      await membership.changeMemberRole({
        userId: OTHER,
        chapterId: CHAPTER,
        actorUserId: ACTOR,
        change,
      });

      expect(emitted()).toMatchObject({
        type: "member.roleChanged",
        chapterId: CHAPTER,
        actorUserId: ACTOR,
        payload: expect.objectContaining({ userId: OTHER, change }),
      });
    },
  );

  it("carries the roles that remain after the change", async () => {
    await membership.changeMemberRole({
      userId: OTHER,
      chapterId: CHAPTER,
      actorUserId: ACTOR,
      change: "demote",
    });

    expect(emitted().payload.roles).toEqual(["pilot"]);
  });

  it("writes no event when the write is refused", async () => {
    db.member.findMany.mockResolvedValue([{ role: "admin" }]);

    await expect(
      membership.changeMemberRole({
        userId: OTHER,
        chapterId: CHAPTER,
        actorUserId: ACTOR,
        change: "demote",
      }),
    ).rejects.toThrow("lastAdmin");
    expect(db.event.create).not.toHaveBeenCalled();
  });
});
