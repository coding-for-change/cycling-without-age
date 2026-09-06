import { prisma } from "@/lib/prisma";
import { activity } from "@/features/activity";

jest.mock("@/lib/prisma", () => ({
  prisma: { activityEvent: { create: jest.fn(), findMany: jest.fn() } },
}));

const db = prisma as unknown as {
  activityEvent: { create: jest.Mock; findMany: jest.Mock };
};

beforeEach(() => jest.clearAllMocks());

describe("recording an event", () => {
  it("refuses a type the enum does not know, before any DB call", () => {
    expect(() =>
      activity.record({ userId: "u1", type: "sabotage" as never }),
    ).toThrow();
    expect(db.activityEvent.create).not.toHaveBeenCalled();
  });

  it("stores an event with no chapter as a global one", async () => {
    await activity.record({
      userId: "u1",
      type: "emailSent",
      payload: { template: "applicationApproved" },
    });
    expect(db.activityEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        type: "emailSent",
        actorUserId: null,
        chapterId: null,
        payload: { template: "applicationApproved" },
      },
    });
  });
});

describe("reading a person's history", () => {
  const where = () => db.activityEvent.findMany.mock.calls[0][0].where;

  // An admin only sees what happened inside the chapters they administer.
  it("asks for the chapters in scope only", async () => {
    await activity.listForUser("u1", { chapterIds: ["c1"] });
    expect(where()).toEqual({
      userId: "u1",
      OR: [{ chapterId: { in: ["c1"] } }],
    });
  });

  it("adds the chapterless events only when asked for them", async () => {
    await activity.listForUser("u1", {
      chapterIds: ["c1"],
      includeGlobal: true,
    });
    expect(where().OR).toEqual([
      { chapterId: { in: ["c1"] } },
      { chapterId: null },
    ]);
  });
});
