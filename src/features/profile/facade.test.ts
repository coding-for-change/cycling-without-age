import { prisma } from "@/lib/prisma";
import { profile } from "@/features/profile";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    event: { create: jest.fn(async () => ({ id: "event-1" })) },
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
  queue: () => ({ add: jest.fn(async () => ({})) }),
}));

const db = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  event: { create: jest.Mock };
};

const USER = "user-pernille";
const CHAPTER = "chapter-muenchen";

const stamped = (count: number) =>
  db.user.updateMany.mockResolvedValue({ count });

beforeEach(() => {
  jest.clearAllMocks();
  stamped(1);
});

describe("completeOnboarding", () => {
  it("stamps the account and announces the welcome once", async () => {
    await expect(
      profile.completeOnboarding(USER, { chapterId: CHAPTER, role: "pilot" }),
    ).resolves.toBe(true);

    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER, onboardedAt: null },
      data: { onboardedAt: expect.any(Date) },
    });
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "user.onboarded",
          chapterId: CHAPTER,
          payload: expect.objectContaining({ userId: USER, role: "pilot" }),
        }),
      }),
    );
  });

  // The conditional write is the guard: a re-submitted last step stamps nothing
  // and so announces nothing.
  it("stays silent when the account was already onboarded", async () => {
    stamped(0);

    await expect(
      profile.completeOnboarding(USER, { chapterId: CHAPTER, role: "pilot" }),
    ).resolves.toBe(false);
    expect(db.event.create).not.toHaveBeenCalled();
  });

  // A pilot can finish onboarding before any chapter has taken them on.
  it("announces a welcome with no chapter behind it", async () => {
    await profile.completeOnboarding(USER, {
      chapterId: null,
      role: "passenger",
    });

    expect(db.event.create.mock.calls[0][0].data).toMatchObject({
      chapterId: null,
      payload: expect.objectContaining({ role: "passenger" }),
    });
  });
});
