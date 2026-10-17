import { requireAuth } from "@/lib/auth-guards";
import {
  acknowledgeLesson,
  startQuiz,
  submitQuiz,
} from "@/use-cases/training-access";
import {
  acknowledgeLessonAction,
  startQuizAction,
  submitQuizAction,
} from "./actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ unstable_rethrow: jest.fn() }));
jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(async () => ({ user: { id: "pilot-1" } })),
}));
jest.mock("@/use-cases/training-access", () => ({
  acknowledgeLesson: jest.fn(async () => ({ completed: true })),
  startQuiz: jest.fn(async () => ({ number: 1 })),
  submitQuiz: jest.fn(),
}));

const COURSE = "clcourse0000000000000001";
const LESSON = "cllesson0000000000000001";
const QUIZ = "clquiz000000000000000001";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("pilot training actions", () => {
  it("records a lesson while training is required", async () => {
    await expect(acknowledgeLessonAction(COURSE, LESSON)).resolves.toEqual({
      ok: true,
      completed: true,
    });
    expect(acknowledgeLesson).toHaveBeenCalledWith("pilot-1", COURSE, LESSON);
  });

  it("starts and submits the quiz element it names", async () => {
    await expect(startQuizAction(COURSE, QUIZ)).resolves.toEqual({
      ok: true,
      number: 1,
    });
    expect(startQuiz).toHaveBeenCalledWith("pilot-1", COURSE, QUIZ);
    (submitQuiz as jest.Mock).mockResolvedValue({ passed: true });
    await expect(
      submitQuizAction(COURSE, QUIZ, { q1: ["a"] }),
    ).resolves.toEqual({ ok: true, result: { passed: true } });
    expect(submitQuiz).toHaveBeenCalledWith("pilot-1", COURSE, QUIZ, {
      q1: ["a"],
    });
  });

  it("maps a locked checkpoint and a wrong element kind", async () => {
    const { DomainError } = jest.requireActual("@/lib/domain-error");
    (startQuiz as jest.Mock).mockRejectedValueOnce(
      new DomainError("quizLocked"),
    );
    await expect(startQuizAction(COURSE, QUIZ)).resolves.toEqual({
      ok: false,
      error: "quizLocked",
    });
    (acknowledgeLesson as jest.Mock).mockRejectedValueOnce(
      new DomainError("elementKindMismatch"),
    );
    await expect(acknowledgeLessonAction(COURSE, QUIZ)).resolves.toEqual({
      ok: false,
      error: "elementKindMismatch",
    });
  });

  it("refuses a missing element id", async () => {
    await expect(startQuizAction(COURSE, "")).resolves.toEqual({
      ok: false,
      error: "generic",
    });
    expect(startQuiz).not.toHaveBeenCalled();
  });

  describe("while training isn't required", () => {
    beforeEach(() => {
      process.env.TRAINING_REQUIRED = "false";
    });
    afterEach(() => {
      process.env.TRAINING_REQUIRED = "true";
    });

    it("refuses every step before reading the session", async () => {
      const refused = { ok: false, error: "generic" };
      await expect(acknowledgeLessonAction(COURSE, LESSON)).resolves.toEqual(
        refused,
      );
      await expect(startQuizAction(COURSE, QUIZ)).resolves.toEqual(refused);
      await expect(submitQuizAction(COURSE, QUIZ, {})).resolves.toEqual(
        refused,
      );
      expect(requireAuth).not.toHaveBeenCalled();
      expect(acknowledgeLesson).not.toHaveBeenCalled();
      expect(startQuiz).not.toHaveBeenCalled();
      expect(submitQuiz).not.toHaveBeenCalled();
    });
  });
});
