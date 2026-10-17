import { training } from "@/features/training";
import { domainCode } from "@/lib/domain-error";
import * as courses from "./services/courses";
import * as lessons from "./services/lessons";
import * as progress from "./services/progress";
import * as quiz from "./services/quiz";
import * as videos from "./services/videos";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const emitted: unknown[] = [];
jest.mock("@/lib/events", () => ({
  transaction: jest.fn((run: (tx: unknown, emit: unknown) => unknown) =>
    run({}, async (event: unknown) => {
      emitted.push(event);
    }),
  ),
}));

jest.mock("./services/videos");
jest.mock("./services/storage");
jest.mock("./services/families");
jest.mock("./services/courses");
jest.mock("./services/lessons");
jest.mock("./services/progress");
jest.mock("./services/quiz");

const mocked = (fn: unknown) => fn as jest.Mock;

const code = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return domainCode(error);
  }
  return null;
};

const countryFamily = {
  id: "family-1",
  scope: "country",
  scopeKey: "country:country-de",
  countryId: "country-de",
  chapterId: null,
  country: { id: "country-de", name: "Germany" },
  chapter: null,
  courses: [],
};

const course = {
  id: "course-1",
  familyId: "family-1",
  language: "de",
  title: "Grundkurs",
  summary: null,
  publishedAt: null,
  family: countryFamily,
};

type Kind = "lesson" | "quiz";

const element = (
  id: string,
  position: number,
  kind: Kind = "lesson",
  over: Record<string, unknown> = {},
) => ({
  id,
  courseId: "course-1",
  kind,
  position,
  title: id,
  body: null,
  videoId: null,
  video: null,
  attachmentFileId: null,
  quizShuffle: false,
  quizDrawCount: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { questions: kind === "quiz" ? 2 : 0 },
  ...over,
});

const question = (id: string, correct: string, lessonId = "quiz-1") => ({
  id,
  lessonId,
  position: 0,
  kind: "single",
  prompt: `Prompt ${id}`,
  explanation: `Why ${id}`,
  options: ["a", "b"].map((option, position) => ({
    id: `${id}-${option}`,
    position,
    text: option,
    correct: option === correct,
  })),
});

let elements: ReturnType<typeof element>[] = [];
let completed: Set<string>;
let passedAt: Date | null;

const useElements = (...rows: ReturnType<typeof element>[]) => {
  elements = rows;
};

const enrollment = () => ({
  id: "enrollment-1",
  courseId: "course-1",
  startedAt: new Date(),
  lastActivityAt: new Date(),
  lastLessonId: null,
  passedAt,
  attemptCount: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  emitted.length = 0;
  elements = [];
  completed = new Set();
  passedAt = null;
  mocked(courses.findCourseById).mockResolvedValue(course);
  mocked(lessons.findLessonsOfCourse).mockImplementation(async () => elements);
  mocked(lessons.findLessonById).mockImplementation(
    async (id: string) => elements.find((row) => row.id === id) ?? null,
  );
  mocked(progress.findCompletedLessonIds).mockImplementation(
    async (_userId: string, ids: string[]) =>
      ids.filter((id) => completed.has(id)),
  );
  mocked(progress.findOneProgress).mockImplementation(
    async (_userId: string, lessonId: string) =>
      completed.has(lessonId)
        ? {
            lessonId,
            furthestSeconds: 0,
            positionSeconds: 0,
            heartbeatAt: new Date(),
            completedAt: new Date(),
          }
        : null,
  );
  mocked(progress.upsertProgress).mockImplementation(
    async (_userId: string, lessonId: string, data: { completedAt: Date }) => {
      if (data.completedAt) completed.add(lessonId);
      return { lessonId, ...data };
    },
  );
  mocked(progress.completeElementOnce).mockImplementation(
    async (_tx: unknown, _userId: string, lessonId: string) => {
      const fresh = !completed.has(lessonId);
      completed.add(lessonId);
      return { count: fresh ? 1 : 0 };
    },
  );
  mocked(progress.touchEnrollment).mockImplementation(async () => enrollment());
  mocked(progress.findEnrollments).mockImplementation(async () => [
    enrollment(),
  ]);
  mocked(progress.findEnrollmentId).mockImplementation(async () => ({
    id: "enrollment-1",
    passedAt,
  }));
  mocked(progress.markPassedOnce).mockImplementation(
    async (_tx: unknown, _id: string, at: Date) => {
      if (passedAt) return { count: 0 };
      passedAt = at;
      return { count: 1 };
    },
  );
  mocked(progress.findLatestAttempt).mockResolvedValue(null);
  mocked(progress.insertAttempt).mockImplementation(async (data) => ({
    id: `attempt-${data.lessonId}`,
    submittedAt: null,
    ...data,
  }));
  mocked(progress.submitAttemptRow).mockResolvedValue({ count: 1 });
  mocked(progress.countAttempt).mockResolvedValue({ id: "enrollment-1" });
  mocked(quiz.findQuestions).mockImplementation(async (lessonId: string) => [
    question(`${lessonId}-q1`, "a", lessonId),
    { ...question(`${lessonId}-q2`, "b", lessonId), position: 1 },
  ]);
});

const rightAnswers = (quizId: string) => ({
  [`${quizId}-q1`]: [`${quizId}-q1-a`],
  [`${quizId}-q2`]: [`${quizId}-q2-b`],
});

describe("course authority", () => {
  it("gives a country course to its country's admins only", async () => {
    expect(await training.courseAuthority("course-1")).toEqual({
      chapters: [],
      countryIds: ["country-de"],
    });
  });

  it("gives an element and its questions the authority of their course", async () => {
    useElements(element("quiz-1", 0, "quiz"));
    mocked(quiz.findQuestionById).mockResolvedValue({
      ...question("q1", "a"),
      lessonId: "quiz-1",
    });
    const expected = { chapters: [], countryIds: ["country-de"] };
    expect(await training.elementAuthority("quiz-1")).toEqual(expected);
    expect(await training.questionAuthority("q1")).toEqual(expected);
  });
});

describe("publishing", () => {
  it("refuses an empty course", async () => {
    expect(
      await code(() => training.updateCourse("course-1", { published: true })),
    ).toBe("courseEmpty");
  });

  it("refuses an unfinished question and an empty quiz", async () => {
    useElements(element("l1", 0), element("quiz-1", 1, "quiz"));
    mocked(quiz.findQuestionsOfLessons).mockResolvedValue([
      { ...question("q1", "a"), prompt: "" },
    ]);
    expect(
      await code(() => training.updateCourse("course-1", { published: true })),
    ).toBe("quizInvalid");

    useElements(
      element("l1", 0),
      element("quiz-1", 1, "quiz"),
      element("quiz-2", 2, "quiz"),
    );
    mocked(quiz.findQuestionsOfLessons).mockResolvedValue([
      question("q1", "a"),
    ]);
    expect(
      await code(() => training.updateCourse("course-1", { published: true })),
    ).toBe("quizInvalid");
    expect(courses.updateCourseById).not.toHaveBeenCalled();
  });

  it("publishes a course with lessons and finished quizzes", async () => {
    useElements(element("l1", 0), element("quiz-1", 1, "quiz"));
    mocked(quiz.findQuestionsOfLessons).mockResolvedValue([
      question("q1", "a"),
    ]);
    await training.updateCourse("course-1", { published: true });
    expect(courses.updateCourseById).toHaveBeenCalledWith(
      "course-1",
      expect.objectContaining({ publishedAt: expect.any(Date) }),
    );
  });
});

describe("elements", () => {
  it("inserts a new element at the requested position", async () => {
    useElements(element("l1", 0), element("l2", 1));
    mocked(lessons.insertLessonAt).mockResolvedValue({
      id: "quiz-new",
      position: 1,
    });
    await expect(
      training.createElement({
        courseId: "course-1",
        kind: "quiz",
        title: "Check",
        position: 1,
      }),
    ).resolves.toEqual({ id: "quiz-new", position: 1 });
    expect(lessons.insertLessonAt).toHaveBeenCalledWith(
      { courseId: "course-1", kind: "quiz", title: "Check" },
      1,
    );
  });

  it("appends when no position is given", async () => {
    mocked(lessons.insertLessonAt).mockResolvedValue({ id: "x", position: 0 });
    await training.createElement({
      courseId: "course-1",
      kind: "lesson",
      title: "First",
    });
    expect(lessons.insertLessonAt).toHaveBeenCalledWith(
      { courseId: "course-1", kind: "lesson", title: "First" },
      null,
    );
  });

  it("keeps lesson fields off quizzes and quiz settings off lessons", async () => {
    useElements(element("l1", 0), element("quiz-1", 1, "quiz"));
    expect(
      await code(() =>
        training.updateElement("quiz-1", { videoId: "video-1" }, "admin-1"),
      ),
    ).toBe("elementKindMismatch");
    expect(
      await code(() =>
        training.updateElement("l1", { quizShuffle: true }, "admin-1"),
      ),
    ).toBe("elementKindMismatch");
    expect(lessons.updateLessonById).not.toHaveBeenCalled();

    await training.updateElement(
      "quiz-1",
      { quizShuffle: true, quizDrawCount: 5, title: "Check" },
      "admin-1",
    );
    expect(lessons.updateLessonById).toHaveBeenCalledWith("quiz-1", {
      quizShuffle: true,
      quizDrawCount: 5,
      title: "Check",
    });
  });

  it("adds questions to quizzes only", async () => {
    useElements(element("l1", 0), element("quiz-1", 1, "quiz"));
    mocked(quiz.maxQuestionPosition).mockResolvedValue(-1);
    mocked(quiz.insertQuestion).mockResolvedValue({ id: "q-new" });
    expect(await code(() => training.createQuestion("l1"))).toBe(
      "elementKindMismatch",
    );
    await training.createQuestion("quiz-1");
    expect(quiz.insertQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: "quiz-1", position: 0 }),
    );
  });

  it("refuses an order that leaves out or invents an element", async () => {
    useElements(element("l1", 0), element("quiz-1", 1, "quiz"));
    expect(
      await code(() =>
        training.reorderElements({
          courseId: "course-1",
          elementIds: ["quiz-1", "foreign"],
        }),
      ),
    ).toBe("unknownTrainingLesson");
    await training.reorderElements({
      courseId: "course-1",
      elementIds: ["quiz-1", "l1"],
    });
    expect(lessons.setLessonPositions).toHaveBeenCalledWith(["quiz-1", "l1"]);
  });
});

describe("lesson videos", () => {
  const video = (scope: string, over: Record<string, unknown> = {}) => ({
    id: "video-1",
    scope,
    countryId: scope === "country" ? "country-dk" : null,
    chapterId: scope === "chapter" ? "chapter-aarhus" : null,
    chapter: scope === "chapter" ? { countryId: "country-dk" } : null,
    status: "ready",
    archivedAt: null,
    ...over,
  });

  beforeEach(() => useElements(element("l1", 0)));

  it("accepts a global video and refuses another country's", async () => {
    mocked(videos.findVideoById).mockResolvedValue(video("global"));
    await training.updateElement("l1", { videoId: "video-1" }, "admin-1");
    expect(lessons.updateLessonById).toHaveBeenCalled();

    mocked(videos.findVideoById).mockResolvedValue(video("country"));
    expect(
      await code(() =>
        training.updateElement("l1", { videoId: "video-1" }, "admin-1"),
      ),
    ).toBe("videoNotAllowed");
  });

  it("refuses a video that isn't ready", async () => {
    mocked(videos.findVideoById).mockResolvedValue(
      video("global", { status: "processing" }),
    );
    expect(
      await code(() =>
        training.updateElement("l1", { videoId: "video-1" }, "admin-1"),
      ),
    ).toBe("videoNotReady");
  });
});

describe("quiz checkpoints", () => {
  beforeEach(() =>
    useElements(
      element("l1", 0),
      element("quiz-1", 1, "quiz"),
      element("l2", 2),
      element("quiz-2", 3, "quiz"),
    ),
  );

  it("keeps a quiz locked until everything before it is complete", async () => {
    expect(await code(() => training.startAttempt("pilot-1", "quiz-1"))).toBe(
      "quizLocked",
    );
    expect(progress.insertAttempt).not.toHaveBeenCalled();
  });

  it("keeps a lesson behind an unpassed quiz locked", async () => {
    completed.add("l1");
    expect(
      await code(() =>
        training.acknowledgeLesson("pilot-1", {
          id: "l2",
          courseId: "course-1",
          kind: "lesson",
          durationSeconds: null,
        }),
      ),
    ).toBe("quizLocked");
    expect(
      await code(() =>
        training.recordHeartbeat(
          "pilot-1",
          {
            id: "l2",
            courseId: "course-1",
            kind: "lesson",
            durationSeconds: 300,
          },
          { lessonId: "l2", position: 3, furthest: 3 },
        ),
      ),
    ).toBe("quizLocked");
    expect(progress.upsertProgress).not.toHaveBeenCalled();
  });

  it("never completes a quiz through a lesson path", async () => {
    completed.add("l1");
    const quizElement = {
      id: "quiz-1",
      courseId: "course-1",
      kind: "quiz" as const,
      durationSeconds: null,
    };
    expect(
      await code(() => training.acknowledgeLesson("pilot-1", quizElement)),
    ).toBe("elementKindMismatch");
    expect(
      await code(() =>
        training.recordHeartbeat("pilot-1", quizElement, {
          lessonId: "quiz-1",
          position: 1,
          furthest: 1,
        }),
      ),
    ).toBe("elementKindMismatch");
    expect(completed.has("quiz-1")).toBe(false);
  });

  it("serves questions without answers", async () => {
    completed.add("l1");
    const started = await training.startAttempt("pilot-1", "quiz-1");
    expect(started.questions).toHaveLength(2);
    expect(JSON.stringify(started)).not.toContain("correct");
    expect(JSON.stringify(started)).not.toContain("Why");
  });

  it("passes the course only when the last quiz is passed after every lesson", async () => {
    completed.add("l1");
    const first = await training.submitAttempt(
      "pilot-1",
      "quiz-1",
      rightAnswers("quiz-1"),
      "chapter-berlin",
    );
    expect(first).toMatchObject({
      passed: true,
      firstPass: true,
      coursePassed: false,
    });
    expect(passedAt).toBeNull();
    expect(emitted).toEqual([]);

    await training.acknowledgeLesson(
      "pilot-1",
      { id: "l2", courseId: "course-1", kind: "lesson", durationSeconds: null },
      "chapter-berlin",
    );
    expect(passedAt).toBeNull();

    const last = await training.submitAttempt(
      "pilot-1",
      "quiz-2",
      rightAnswers("quiz-2"),
      "chapter-berlin",
    );
    expect(last).toMatchObject({ passed: true, coursePassed: true });
    expect(passedAt).toBeInstanceOf(Date);
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "training.coursePassed",
        userId: "pilot-1",
        courseId: "course-1",
        familyId: "family-1",
        attemptId: "attempt-quiz-2",
        chapterId: "chapter-berlin",
      }),
    ]);
  });

  it("passes the course once and never clears it", async () => {
    for (const id of ["l1", "quiz-1", "l2"]) completed.add(id);
    await training.submitAttempt(
      "pilot-1",
      "quiz-2",
      rightAnswers("quiz-2"),
      null,
    );
    const first = passedAt;
    const again = await training.submitAttempt(
      "pilot-1",
      "quiz-2",
      rightAnswers("quiz-2"),
      null,
    );
    expect(again).toMatchObject({ passed: true, firstPass: false });
    expect(passedAt).toBe(first);
    await training.submitAttempt(
      "pilot-1",
      "quiz-2",
      { "quiz-2-q1": ["quiz-2-q1-b"] },
      null,
    );
    expect(passedAt).toBe(first);
    expect(emitted).toHaveLength(1);
  });

  it("returns the explanation and the next attempt after a fail", async () => {
    completed.add("l1");
    const result = await training.submitAttempt(
      "pilot-1",
      "quiz-1",
      { "quiz-1-q1": ["quiz-1-q1-b"], "quiz-1-q2": ["quiz-1-q2-b"] },
      null,
    );
    expect(result.passed).toBe(false);
    expect(result.questions).toContainEqual(
      expect.objectContaining({
        id: "quiz-1-q1",
        correct: false,
        explanation: "Why quiz-1-q1",
      }),
    );
    expect(result.next?.number).toBe(1);
    expect(progress.completeElementOnce).not.toHaveBeenCalled();
    expect(progress.countAttempt).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([]);
  });

  it("continues an open attempt and numbers the next one after a submit", async () => {
    completed.add("l1");
    mocked(progress.findLatestAttempt).mockResolvedValue({
      id: "attempt-open",
      number: 2,
      submittedAt: null,
      questionOrder: [],
      lessonId: "quiz-1",
    });
    await expect(training.startAttempt("pilot-1", "quiz-1")).resolves.toEqual({
      number: 2,
      questions: [],
    });
    expect(progress.insertAttempt).not.toHaveBeenCalled();

    mocked(progress.findLatestAttempt).mockResolvedValue({
      id: "attempt-done",
      number: 2,
      submittedAt: new Date(),
      questionOrder: [],
      lessonId: "quiz-1",
    });
    const started = await training.startAttempt("pilot-1", "quiz-1");
    expect(started.number).toBe(3);
  });

  it("refuses a second submit of the same attempt", async () => {
    completed.add("l1");
    mocked(progress.submitAttemptRow).mockResolvedValue({ count: 0 });
    expect(
      await code(() => training.submitAttempt("pilot-1", "quiz-1", {}, null)),
    ).toBe("quizAttemptClosed");
  });
});

describe("a course that ends with a lesson", () => {
  beforeEach(() =>
    useElements(
      element("l1", 0),
      element("quiz-1", 1, "quiz"),
      element("l2", 2),
    ),
  );

  it("passes when the last lesson is read", async () => {
    completed.add("l1");
    completed.add("quiz-1");
    await training.acknowledgeLesson(
      "pilot-1",
      { id: "l2", courseId: "course-1", kind: "lesson", durationSeconds: null },
      "chapter-berlin",
    );
    expect(passedAt).toBeInstanceOf(Date);
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "training.coursePassed",
        attemptId: null,
        chapterId: "chapter-berlin",
      }),
    ]);
  });

  it("passes when the last video is watched", async () => {
    completed.add("l1");
    completed.add("quiz-1");
    mocked(progress.findOneProgress).mockResolvedValue({
      lessonId: "l2",
      furthestSeconds: 95,
      positionSeconds: 95,
      heartbeatAt: new Date(Date.now() - 10_000),
      completedAt: null,
    });
    const result = await training.recordHeartbeat(
      "pilot-1",
      { id: "l2", courseId: "course-1", kind: "lesson", durationSeconds: 100 },
      { lessonId: "l2", position: 100, furthest: 100 },
    );
    expect(result).toEqual({ completed: true });
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "training.coursePassed",
        attemptId: null,
      }),
    ]);
  });

  it("doesn't pass again when a completed lesson is read again", async () => {
    for (const id of ["l1", "quiz-1", "l2"]) completed.add(id);
    passedAt = new Date("2026-10-01");
    await training.acknowledgeLesson("pilot-1", {
      id: "l2",
      courseId: "course-1",
      kind: "lesson",
      durationSeconds: null,
    });
    expect(passedAt).toEqual(new Date("2026-10-01"));
    expect(emitted).toEqual([]);
  });
});

describe("heartbeats", () => {
  beforeEach(() => useElements(element("l1", 0)));

  it("ignores a lesson without a video", async () => {
    await expect(
      training.recordHeartbeat(
        "pilot-1",
        {
          id: "l1",
          courseId: "course-1",
          kind: "lesson",
          durationSeconds: null,
        },
        { lessonId: "l1", position: 10, furthest: 10 },
      ),
    ).resolves.toEqual({ completed: false });
    expect(progress.upsertProgress).not.toHaveBeenCalled();
  });

  it("caps a first beat at five seconds", async () => {
    await training.recordHeartbeat(
      "pilot-1",
      { id: "l1", courseId: "course-1", kind: "lesson", durationSeconds: 300 },
      { lessonId: "l1", position: 290, furthest: 290 },
    );
    expect(progress.upsertProgress).toHaveBeenCalledWith(
      "pilot-1",
      "l1",
      expect.objectContaining({ furthestSeconds: 5, completedAt: null }),
    );
  });
});

describe("videos in use", () => {
  it("can't be deleted", async () => {
    mocked(videos.findVideoById).mockResolvedValue({ id: "video-1" });
    mocked(lessons.countLessonsUsingVideo).mockResolvedValue(2);
    expect(await code(() => training.deleteVideo("video-1", "admin-1"))).toBe(
      "videoInUse",
    );
    expect(videos.deleteVideoById).not.toHaveBeenCalled();
  });
});
