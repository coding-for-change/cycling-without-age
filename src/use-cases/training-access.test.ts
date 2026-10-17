import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { training } from "@/features/training";
import type { Access } from "@/lib/access";
import { domainCode } from "@/lib/domain-error";
import {
  acknowledgeLesson,
  courseOverview,
  elementPage,
  readableTrainingAttachment,
  recordLessonProgress,
  startQuiz,
  submitQuiz,
} from "./training-access";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryIds: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(async () => []),
    listApplicationsOfUser: jest.fn(async () => []),
  },
}));
jest.mock("@/features/training", () => {
  const actual = jest.requireActual("@/features/training/facade");
  const elements = jest.requireActual("@/features/training/elements");
  return {
    ...elements,
    training: {
      attachmentOf: jest.fn(),
      getCourse: jest.fn(),
      publishedCourses: jest.fn(async () => []),
      outlinesFor: jest.fn(async () => new Map()),
      progressOf: jest.fn(async () => new Map()),
      enrollmentsOf: jest.fn(async () => new Map()),
      lessonForLearner: jest.fn(),
      quizPreview: jest.fn(),
      recordHeartbeat: jest.fn(async () => ({ completed: false })),
      acknowledgeLesson: jest.fn(async () => ({ completed: true })),
      startAttempt: jest.fn(async () => ({ number: 0, questions: [] })),
      submitAttempt: jest.fn(async () => ({ passed: true })),
      familyAuthority: actual.familyAuthority,
      familyVisibleTo: actual.familyVisibleTo,
      familyVisibleToChapter: actual.familyVisibleToChapter,
    },
  };
});
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const mocked = (fn: unknown) => fn as jest.Mock;

const code = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return domainCode(error);
  }
  return null;
};

const COUNTRY = "country-de";
const file = {
  id: "file-1",
  key: "files/trainingAttachment/1.pdf",
  mime: "application/pdf",
};

const none: Access = { role: null, countryAdminOf: [], memberships: [] };
const viewer = (access: Access, id = "viewer") => ({ user: { id }, access });
const chapterAdmin = (chapterId: string) =>
  viewer({ ...none, memberships: [{ chapterId, roles: ["admin"] }] });

const countryFamily = {
  scope: "country",
  countryId: COUNTRY,
  chapterId: null,
  chapter: null,
};
const chapterFamily = {
  scope: "chapter",
  countryId: null,
  chapterId: "chapter-b",
  chapter: { countryId: COUNTRY },
};

const attachment = (lessonId: string, chapterOwned = false) => ({
  file,
  uploadedByUserId: "someone",
  lesson: { id: lessonId, courseId: "course-1" },
  authority: chapterOwned
    ? {
        chapters: [{ chapterId: "chapter-b", countryId: COUNTRY }],
        countryIds: [],
      }
    : { chapters: [], countryIds: [COUNTRY] },
});

type Kind = "lesson" | "quiz";

const outline = (
  id: string,
  kind: Kind,
  extra: Record<string, unknown> = {},
) => ({
  id,
  courseId: "course-1",
  kind,
  title: id,
  durationSeconds: null,
  poster: null,
  posterLarge: null,
  hasVideo: false,
  questionCount: kind === "quiz" ? 2 : 0,
  ...extra,
});

const done = (...ids: string[]) =>
  mocked(training.progressOf).mockResolvedValue(
    new Map(
      ids.map((lessonId) => [
        lessonId,
        { lessonId, furthestSeconds: 0, positionSeconds: 0, completed: true },
      ]),
    ),
  );

const asPilot = () => {
  mocked(membership.listMembershipsOfUser).mockResolvedValue([
    { chapterId: "chapter-a", roles: ["pilot"] },
  ]);
  mocked(training.publishedCourses).mockResolvedValue([
    {
      id: "course-1",
      familyId: "family-1",
      language: "de",
      title: "Grundkurs",
      summary: null,
      publishedAt: new Date(),
      family: countryFamily,
    },
  ]);
  mocked(training.outlinesFor).mockResolvedValue(
    new Map([
      [
        "course-1",
        [
          outline("l1", "lesson", { durationSeconds: 60, hasVideo: true }),
          outline("quiz-1", "quiz"),
          outline("l2", "lesson", { durationSeconds: 30, hasVideo: true }),
          outline("quiz-2", "quiz"),
        ],
      ],
    ]),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked(membership.listMembershipsOfUser).mockResolvedValue([]);
  mocked(training.publishedCourses).mockResolvedValue([]);
  mocked(training.progressOf).mockResolvedValue(new Map());
  mocked(training.enrollmentsOf).mockResolvedValue(new Map());
  mocked(training.getCourse).mockResolvedValue({
    id: "course-1",
    family: countryFamily,
  });
  mocked(chapters.getChapterCountryIds).mockImplementation(
    async (ids: string[]) => new Map(ids.map((id) => [id, COUNTRY])),
  );
  mocked(training.lessonForLearner).mockImplementation(async (id: string) => ({
    id,
    courseId: "course-1",
    kind: "lesson",
    title: id,
    body: null,
    attachmentFileId: null,
    durationSeconds: 60,
    playback: null,
  }));
  mocked(training.quizPreview).mockResolvedValue({
    number: 0,
    passedAt: null,
    attempts: 0,
    questions: [],
  });
});

describe("courseOverview", () => {
  it("lists lessons and quizzes in order with checkpoint locks", async () => {
    asPilot();
    done("l1");
    const card = await courseOverview("pilot-1", "course-1");
    expect(
      card?.elements.map((element) => [element.id, element.locked]),
    ).toEqual([
      ["l1", false],
      ["quiz-1", false],
      ["l2", true],
      ["quiz-2", true],
    ]);
    expect(card).toMatchObject({
      lessonCount: 2,
      quizCount: 2,
      durationSeconds: 90,
      progress: {
        completedElements: 1,
        totalElements: 4,
        percent: 25,
        nextElementId: "quiz-1",
        nextElementKind: "quiz",
      },
    });
  });

  it("reports 100% once passed, even after new elements", async () => {
    asPilot();
    done("l1");
    mocked(training.enrollmentsOf).mockResolvedValue(
      new Map([
        [
          "course-1",
          {
            courseId: "course-1",
            startedAt: new Date(),
            passedAt: new Date(),
            attemptCount: 3,
          },
        ],
      ]),
    );
    const card = await courseOverview("pilot-1", "course-1");
    expect(card?.progress).toMatchObject({ percent: 100, attempts: 3 });
  });

  it("hides a course from someone without a training chapter", async () => {
    expect(await courseOverview("nobody", "course-1")).toBeNull();
  });
});

describe("elementPage", () => {
  beforeEach(() => asPilot());

  it("renders a lesson with its neighbours", async () => {
    const page = await elementPage("pilot-1", "course-1", "l1");
    expect(page).toMatchObject({
      kind: "lesson",
      index: 0,
      previous: null,
      next: { id: "quiz-1", kind: "quiz" },
      blocker: null,
    });
  });

  it("renders a quiz with its preview and a lock until the lessons are done", async () => {
    const locked = await elementPage("pilot-1", "course-1", "quiz-1");
    expect(locked).toMatchObject({
      kind: "quiz",
      element: { locked: true },
      blocker: { id: "l1" },
    });
    expect(training.quizPreview).toHaveBeenCalledWith("pilot-1", "quiz-1");

    done("l1");
    const open = await elementPage("pilot-1", "course-1", "quiz-1");
    expect(open).toMatchObject({ kind: "quiz", element: { locked: false } });
  });

  it("shows a lesson behind an unpassed quiz as locked, pointing to the quiz", async () => {
    done("l1");
    const page = await elementPage("pilot-1", "course-1", "l2");
    expect(page).toMatchObject({ kind: "locked", blocker: { id: "quiz-1" } });
    expect(training.lessonForLearner).not.toHaveBeenCalled();
  });

  it("knows no element of another course", async () => {
    expect(await elementPage("pilot-1", "course-1", "foreign")).toBeNull();
  });
});

describe("learner writes", () => {
  beforeEach(() => asPilot());

  it("records progress on reachable lessons only", async () => {
    await recordLessonProgress("pilot-1", "course-1", {
      lessonId: "l1",
      position: 1,
      furthest: 1,
    });
    expect(training.recordHeartbeat).toHaveBeenCalledWith(
      "pilot-1",
      expect.objectContaining({ id: "l1" }),
      { lessonId: "l1", position: 1, furthest: 1 },
      "chapter-a",
    );
    expect(
      await code(() =>
        recordLessonProgress("pilot-1", "course-1", {
          lessonId: "l2",
          position: 1,
          furthest: 1,
        }),
      ),
    ).toBe("quizLocked");
    expect(
      await code(() => acknowledgeLesson("pilot-1", "course-1", "quiz-1")),
    ).toBe("unknownTrainingLesson");
  });

  it("starts and submits only quiz elements of the course", async () => {
    await startQuiz("pilot-1", "course-1", "quiz-1");
    expect(training.startAttempt).toHaveBeenCalledWith("pilot-1", "quiz-1");
    await submitQuiz("pilot-1", "course-1", "quiz-1", { q: ["a"] });
    expect(training.submitAttempt).toHaveBeenCalledWith(
      "pilot-1",
      "quiz-1",
      { q: ["a"] },
      "chapter-a",
    );
    expect(await code(() => startQuiz("pilot-1", "course-1", "l1"))).toBe(
      "unknownTrainingLesson",
    );
    expect(
      await code(() => submitQuiz("pilot-1", "course-1", "foreign", {})),
    ).toBe("unknownTrainingLesson");
  });
});

describe("readableTrainingAttachment", () => {
  it("keeps a chapter-B course's attachment from a chapter-A admin", async () => {
    mocked(training.getCourse).mockResolvedValue({
      id: "course-1",
      family: chapterFamily,
    });
    mocked(training.attachmentOf).mockResolvedValue(attachment("l1", true));
    expect(
      await readableTrainingAttachment(chapterAdmin("chapter-a"), "file-1"),
    ).toBeNull();
    expect(
      await readableTrainingAttachment(chapterAdmin("chapter-b"), "file-1"),
    ).toEqual(file);
  });

  it("lets the country admin and any admin who sees the course read it", async () => {
    mocked(training.attachmentOf).mockResolvedValue(attachment("l1"));
    expect(
      await readableTrainingAttachment(
        viewer({ ...none, countryAdminOf: [COUNTRY] }),
        "file-1",
      ),
    ).toEqual(file);
    expect(
      await readableTrainingAttachment(chapterAdmin("chapter-a"), "file-1"),
    ).toEqual(file);
  });

  it("serves a pilot the attachment of a reachable lesson only", async () => {
    asPilot();
    done("l1");
    mocked(training.attachmentOf).mockResolvedValue(attachment("l1"));
    const pilot = viewer(
      { ...none, memberships: [{ chapterId: "chapter-a", roles: ["pilot"] }] },
      "pilot-1",
    );
    expect(await readableTrainingAttachment(pilot, "file-1")).toEqual(file);
    mocked(training.attachmentOf).mockResolvedValue(attachment("l2"));
    expect(await readableTrainingAttachment(pilot, "file-1")).toBeNull();
  });

  it("refuses someone with neither admin nor course access", async () => {
    mocked(training.attachmentOf).mockResolvedValue(attachment("l1"));
    expect(await readableTrainingAttachment(viewer(none), "file-1")).toBeNull();
    expect(membership.listMembershipsOfUser).toHaveBeenCalled();
  });

  it("serves an unattached upload to its uploader only", async () => {
    mocked(training.attachmentOf).mockResolvedValue({
      ...attachment("l1"),
      lesson: null,
      uploadedByUserId: "viewer",
    });
    expect(await readableTrainingAttachment(viewer(none), "file-1")).toEqual(
      file,
    );
  });
});
