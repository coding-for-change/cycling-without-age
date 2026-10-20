import { insertLessonAt } from "./lessons";

const tx = {
  trainingLesson: {
    aggregate: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(async ({ data }: { data: { position: number } }) => ({
      id: "new",
      position: data.position,
    })),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (run: (client: unknown) => unknown) => run(tx),
  },
}));

const lastPosition = (position: number | null) =>
  tx.trainingLesson.aggregate.mockResolvedValue({
    _max: { position },
  });

beforeEach(() => jest.clearAllMocks());

describe("insertLessonAt", () => {
  it("shifts the elements at and after the position", async () => {
    lastPosition(3);
    await expect(
      insertLessonAt({ courseId: "c", kind: "quiz", title: "Q" }, 1),
    ).resolves.toEqual({ id: "new", position: 1 });
    expect(tx.trainingLesson.updateMany).toHaveBeenCalledWith({
      where: { courseId: "c", position: { gte: 1 } },
      data: { position: { increment: 1 } },
    });
  });

  it("appends without shifting when no position or a far one is given", async () => {
    lastPosition(3);
    await expect(
      insertLessonAt({ courseId: "c", kind: "lesson", title: "L" }, null),
    ).resolves.toEqual({ id: "new", position: 4 });
    await expect(
      insertLessonAt({ courseId: "c", kind: "lesson", title: "L" }, 40),
    ).resolves.toEqual({ id: "new", position: 4 });
    expect(tx.trainingLesson.updateMany).not.toHaveBeenCalled();
  });

  it("starts an empty course at zero", async () => {
    lastPosition(null);
    await expect(
      insertLessonAt({ courseId: "c", kind: "lesson", title: "L" }, 0),
    ).resolves.toEqual({ id: "new", position: 0 });
    expect(tx.trainingLesson.updateMany).not.toHaveBeenCalled();
  });
});
