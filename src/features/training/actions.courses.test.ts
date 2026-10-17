import { allowsAdmin, isCountryAdmin, isSuperAdmin } from "@/lib/access";
import type {
  Access,
  ActiveScope,
  AdminAuthority,
  AdminScope,
} from "@/lib/access";
import { requireCatalogueOwner } from "@/lib/auth-guards";
import { training } from "@/features/training";
import {
  requirementImpact,
  setTrainingRequirement,
} from "@/use-cases/training-requirements";
import {
  courseRequiredImpactAction,
  createCourseAction,
  createElementAction,
  createQuestionAction,
  deleteElementAction,
  reorderElementsAction,
  reorderQuestionsAction,
  saveQuestionAction,
  setCourseRequiredAction,
  updateCourseAction,
  updateElementAction,
} from "./actions";

const CHAPTER_COUNTRY: Record<string, string> = {
  "chapter-berlin": "country-de",
  "chapter-aarhus": "country-dk",
};

const DE = { id: "country-de", code: "DE", name: "Germany" };
const BERLIN = {
  id: "chapter-berlin",
  slug: "berlin",
  name: "Berlin",
  countryId: "country-de",
};

let access: Access;
let adminScope: AdminScope;
let active: ActiveScope;
const session = () => ({ user: { id: "admin-1" }, access });
const forbidden = () => {
  throw new Error("FORBIDDEN");
};
const chapterAllowed = (chapterId: string) =>
  allowsAdmin(access, {
    countryIds: [],
    chapters: [{ chapterId, countryId: CHAPTER_COUNTRY[chapterId] }],
  });

const scopeOf = (
  global: boolean,
  countries: AdminScope["countries"],
  chapters: AdminScope["chapters"],
): AdminScope => ({
  global,
  countries,
  chapters,
  canSeeChapters: true,
  canSeeCountries: global,
  canCreateCountries: global,
  canDeleteAccounts: global,
  canSeeGlobalEvents: global,
});

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({
  unstable_rethrow: jest.fn(),
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));
jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/storage", () => ({ withinUploadLimit: () => true }));
jest.mock("@/lib/admin-scope-cookie", () => ({
  ...jest.requireActual("@/lib/admin-scope-cookie"),
  storedActiveScope: jest.fn(async () => active),
}));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminOf: jest.fn(async (authority: AdminAuthority) =>
    allowsAdmin(access, authority) ? session() : forbidden(),
  ),
  requireAdminScope: jest.fn(async () => ({
    session: session(),
    scope: adminScope,
  })),
  requireCatalogueOwner: jest.fn(
    async (
      owner:
        | { scope: "global" }
        | { scope: "country"; countryId: string }
        | { scope: "chapter"; chapterId: string },
    ) => {
      const ok =
        owner.scope === "global"
          ? isSuperAdmin(access)
          : owner.scope === "country"
            ? isCountryAdmin(access, owner.countryId)
            : chapterAllowed(owner.chapterId);
      return ok ? session() : forbidden();
    },
  ),
}));
jest.mock("@/use-cases/training-requirements", () => ({
  setTrainingRequirement: jest.fn(async () => ({ id: "req-1" })),
  requirementImpact: jest.fn(async () => ({ pilots: 2 })),
}));
jest.mock("@/features/training", () => ({
  training: {
    courseAuthority: jest.fn(),
    elementAuthority: jest.fn(),
    questionAuthority: jest.fn(),
    familyOwner: jest.fn(),
    createCourse: jest.fn(async () => ({ courseId: "course-1" })),
    updateCourse: jest.fn(),
    createElement: jest.fn(async () => ({ id: "element-1", position: 2 })),
    updateElement: jest.fn(),
    deleteElement: jest.fn(),
    reorderElements: jest.fn(),
    createQuestion: jest.fn(async () => ({ id: "question-1" })),
    reorderQuestions: jest.fn(),
    saveQuestion: jest.fn(async () => ({
      question: { options: [] },
      issues: [],
    })),
    removeRequirementOf: jest.fn(),
  },
}));

const none: Access = { role: null, countryAdminOf: [], memberships: [] };
const berlinAdmin: Access = {
  ...none,
  memberships: [{ chapterId: "chapter-berlin", roles: ["admin"] }],
};
const germanyAdmin: Access = { ...none, countryAdminOf: ["country-de"] };
const superadmin: Access = { ...none, role: "superadmin" };

const globalCourse: AdminAuthority = { chapters: [], countryIds: [] };
const danishCourse: AdminAuthority = {
  chapters: [],
  countryIds: ["country-dk"],
};
const germanCourse: AdminAuthority = {
  chapters: [],
  countryIds: ["country-de"],
};
const berlinCourse: AdminAuthority = {
  chapters: [{ chapterId: "chapter-berlin", countryId: "country-de" }],
  countryIds: [],
};

const courseIs = (authority: AdminAuthority) => {
  (training.courseAuthority as jest.Mock).mockResolvedValue(authority);
  (training.elementAuthority as jest.Mock).mockResolvedValue(authority);
  (training.questionAuthority as jest.Mock).mockResolvedValue(authority);
};

const denied = { ok: false, error: "generic" };

const everyWrite = () => [
  updateCourseAction("course-1", { title: "Hijack" }),
  createElementAction({ courseId: "course-1", kind: "lesson", title: "Mine" }),
  createElementAction({ courseId: "course-1", kind: "quiz", title: "Quiz" }),
  updateElementAction("element-1", { title: "Hijack" }),
  deleteElementAction("element-1"),
  reorderElementsAction({ courseId: "course-1", elementIds: ["a", "b"] }),
  createQuestionAction("element-1"),
  reorderQuestionsAction({ elementId: "element-1", questionIds: ["q"] }),
  saveQuestionAction("question-1", {
    kind: "single",
    prompt: "x",
    explanation: null,
    options: [],
  }),
];

const writeMocks = () => [
  training.updateCourse,
  training.createElement,
  training.updateElement,
  training.deleteElement,
  training.reorderElements,
  training.createQuestion,
  training.reorderQuestions,
  training.saveQuestion,
];

beforeEach(() => jest.clearAllMocks());

describe("a chapter admin of Berlin", () => {
  beforeEach(() => {
    access = berlinAdmin;
    adminScope = scopeOf(false, [], [BERLIN]);
    active = { kind: "chapter", chapter: BERLIN };
  });

  it("can't change anything in a global or a country course", async () => {
    for (const authority of [globalCourse, germanCourse]) {
      courseIs(authority);
      for (const result of await Promise.all(everyWrite()))
        expect(result).toEqual(denied);
    }
    for (const mock of writeMocks()) expect(mock).not.toHaveBeenCalled();
  });

  it("edits the elements of its own chapter's course", async () => {
    courseIs(berlinCourse);
    await expect(
      createElementAction({
        courseId: "course-1",
        kind: "quiz",
        title: "Check",
        position: 1,
      }),
    ).resolves.toEqual({ ok: true, elementId: "element-1", position: 2 });
    expect(training.createElement).toHaveBeenCalledWith({
      courseId: "course-1",
      kind: "quiz",
      title: "Check",
      position: 1,
    });
    await expect(
      updateElementAction("element-1", { quizShuffle: false }),
    ).resolves.toEqual({ ok: true });
    expect(training.updateElement).toHaveBeenCalledWith(
      "element-1",
      { quizShuffle: false },
      "admin-1",
    );
    await expect(createQuestionAction("element-1")).resolves.toEqual({
      ok: true,
      questionId: "question-1",
    });
  });

  it("creates courses only in its own chapter", async () => {
    await expect(
      createCourseAction({
        kind: "family",
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        language: "de",
        title: "Unser Kurs",
      }),
    ).resolves.toEqual({ ok: true, courseId: "course-1" });
    await expect(
      createCourseAction({
        kind: "family",
        owner: { scope: "country", countryId: "country-de" },
        language: "de",
        title: "Hijack",
      }),
    ).resolves.toEqual(denied);
  });

  it("requires a higher-level course for its own chapter only", async () => {
    await expect(
      setCourseRequiredAction({ familyId: "family-global", required: true }),
    ).resolves.toEqual({ ok: true, required: true });
    expect(setTrainingRequirement).toHaveBeenCalledWith(
      {
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        familyId: "family-global",
      },
      "admin-1",
    );
    expect(requireCatalogueOwner).toHaveBeenCalledWith({
      scope: "chapter",
      chapterId: "chapter-berlin",
    });
  });

  it("can't require a course for a chapter outside its scope", async () => {
    await expect(
      setCourseRequiredAction({
        familyId: "family-global",
        required: true,
        scope: "chapter:aarhus",
      }),
    ).resolves.toEqual(denied);
    expect(setTrainingRequirement).not.toHaveBeenCalled();
  });
});

describe("a country admin of Germany", () => {
  beforeEach(() => {
    access = germanyAdmin;
    adminScope = scopeOf(false, [DE], [BERLIN]);
    active = { kind: "country", country: DE };
  });

  it("edits German courses but not Danish or global ones", async () => {
    courseIs(germanCourse);
    await expect(
      updateCourseAction("course-1", { published: true }),
    ).resolves.toEqual({ ok: true });
    await expect(
      updateElementAction("element-1", { title: "Bremsen" }),
    ).resolves.toEqual({ ok: true });
    for (const authority of [danishCourse, globalCourse]) {
      jest.clearAllMocks();
      courseIs(authority);
      for (const result of await Promise.all(everyWrite()))
        expect(result).toEqual(denied);
      for (const mock of writeMocks()) expect(mock).not.toHaveBeenCalled();
    }
  });

  it("translates only families it owns", async () => {
    (training.familyOwner as jest.Mock).mockResolvedValue({
      scope: "country",
      countryId: "country-dk",
    });
    await expect(
      createCourseAction({
        kind: "translation",
        familyId: "family-1",
        language: "en",
        title: "Basics",
      }),
    ).resolves.toEqual(denied);
    expect(training.createCourse).not.toHaveBeenCalled();
  });

  it("sets and removes a requirement for Germany", async () => {
    await expect(
      setCourseRequiredAction({ familyId: "family-1", required: false }),
    ).resolves.toEqual({ ok: true, required: false });
    expect(training.removeRequirementOf).toHaveBeenCalledWith({
      owner: { scope: "country", countryId: "country-de" },
      familyId: "family-1",
    });
    expect(setTrainingRequirement).not.toHaveBeenCalled();
    await expect(
      courseRequiredImpactAction({ familyId: "family-1" }),
    ).resolves.toEqual({ ok: true, pilots: 2 });
    expect(requirementImpact).toHaveBeenCalledWith({
      owner: { scope: "country", countryId: "country-de" },
      familyId: "family-1",
    });
  });

  it("requires a Berlin course for Berlin while looking at Berlin", async () => {
    await expect(
      setCourseRequiredAction({
        familyId: "family-1",
        required: true,
        scope: "chapter:berlin",
      }),
    ).resolves.toEqual({ ok: true, required: true });
    expect(setTrainingRequirement).toHaveBeenCalledWith(
      {
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        familyId: "family-1",
      },
      "admin-1",
    );
  });
});

describe("a country admin of two countries looking at everything", () => {
  beforeEach(() => {
    access = { ...none, countryAdminOf: ["country-de", "country-dk"] };
    adminScope = scopeOf(
      false,
      [DE, { id: "country-dk", code: "DK", name: "Denmark" }],
      [BERLIN],
    );
    active = { kind: "all" };
  });

  it("must pick a scope before requiring a course", async () => {
    await expect(
      setCourseRequiredAction({ familyId: "family-1", required: true }),
    ).resolves.toEqual({ ok: false, error: "scopeAmbiguous" });
    expect(setTrainingRequirement).not.toHaveBeenCalled();
  });
});

describe("a superadmin", () => {
  beforeEach(() => {
    access = superadmin;
    adminScope = scopeOf(true, [DE], [BERLIN]);
    active = { kind: "all" };
  });

  it("edits a global course and requires it globally", async () => {
    courseIs(globalCourse);
    await expect(
      updateElementAction("element-1", { title: "Basics" }),
    ).resolves.toEqual({ ok: true });
    await expect(
      setCourseRequiredAction({ familyId: "family-1", required: true }),
    ).resolves.toEqual({ ok: true, required: true });
    expect(setTrainingRequirement).toHaveBeenCalledWith(
      { owner: { scope: "global" }, familyId: "family-1" },
      "admin-1",
    );
  });

  it("refuses an invalid element kind", async () => {
    await expect(
      createElementAction({ courseId: "course-1", kind: "video", title: "x" }),
    ).resolves.toEqual(denied);
    expect(training.createElement).not.toHaveBeenCalled();
  });
});
