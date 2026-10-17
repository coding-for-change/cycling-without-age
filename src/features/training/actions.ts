"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { allowsAdmin, resolveActiveScope } from "@/lib/access";
import { scopeArgParams, storedActiveScope } from "@/lib/admin-scope-cookie";
import {
  requireAdminOf,
  requireAdminScope,
  requireCatalogueOwner,
} from "@/lib/auth-guards";
import {
  createAttempt,
  DomainError,
  type ActionResult,
  type DomainErrorCode,
} from "@/lib/domain-error";
import {
  commitUpload,
  requestUpload,
  uploadCommit,
  uploadRequest,
  withinUploadLimit,
} from "@/lib/storage";
import {
  requirementImpact,
  setTrainingRequirement,
} from "@/use-cases/training-requirements";
import { training } from "./index";
import { requirementOwnerOf, uploadOwnerOf } from "./scope-owner";
import type { QuizResult } from "./facade";
import type { QuestionIssue } from "./grade";
import {
  courseCreateInput,
  courseRequiredInput,
  courseUpdateInput,
  elementCreateInput,
  elementOrderInput,
  elementUpdateInput,
  questionOrderInput,
  questionSaveInput,
  quizAnswersInput,
  requirementInput,
  id,
  posterSecondsInput,
  videoCompleteInput,
  videoIdsInput,
  videoPartsInput,
  videoStartInput,
  videoUpdateInput,
  type CatalogueOwner,
  type TrainingVideoStatusName,
  type VideoFailureCode,
} from "./schemas";

const MAPPED_ERRORS = [
  "courseEmpty",
  "courseFull",
  "courseLanguageTaken",
  "elementKindMismatch",
  "familyNotAllowed",
  "invalidFile",
  "quizFull",
  "quizInvalid",
  "scopeAmbiguous",
  "unknownTrainingCourse",
  "unknownTrainingLesson",
  "unknownChapter",
  "unknownTrainingQuestion",
  "unknownTrainingRequirement",
  "unknownTrainingVideo",
  "uploadRejected",
  "videoInUse",
  "videoNotAllowed",
  "videoNotFailed",
  "videoNotReady",
  "videoNotUploading",
] as const satisfies readonly DomainErrorCode[];

export type TrainingError =
  (typeof MAPPED_ERRORS)[number] | "rateLimited" | "generic";

export type TrainingResult<T extends object = object> = ActionResult<
  TrainingError,
  T
>;

const INVALID = { ok: false, error: "generic" } as const;

const attemptNumber = z.number().int().min(0).max(10_000);

const { attempt } = createAttempt(MAPPED_ERRORS, () => {
  revalidatePath("/admin/training", "layout");
  revalidatePath("/pilot/training", "layout");
});

const requireVideoManager = async (videoId: string) =>
  requireAdminOf(await training.videoAuthority(videoId));

async function activeScopeOf(arg: string | undefined) {
  const { scope } = await requireAdminScope();
  const active = arg
    ? resolveActiveScope(scope, scopeArgParams(arg))
    : await storedActiveScope(scope);
  if (!active) forbidden();
  return { scope, active };
}

async function ownerFor(
  arg: string | undefined,
  pick: typeof uploadOwnerOf,
): Promise<CatalogueOwner | null> {
  const { scope, active } = await activeScopeOf(arg);
  return pick(scope, active);
}

export async function startVideoUploadAction(
  input: unknown,
): Promise<
  TrainingResult<{ videoId: string; partSize: number; partCount: number }>
> {
  const parsed = videoStartInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const { scope: scopeArg, ...video } = parsed.data;
  const owner = await ownerFor(scopeArg, uploadOwnerOf);
  if (!owner) return { ok: false, error: "scopeAmbiguous" };
  const session = await requireCatalogueOwner(owner);
  if (!withinUploadLimit(session.user.id))
    return { ok: false, error: "rateLimited" };
  return attempt(() =>
    training.createVideo({ ...video, owner }, session.user.id),
  );
}

export async function signVideoPartsAction(
  input: unknown,
): Promise<TrainingResult<{ parts: { partNumber: number; url: string }[] }>> {
  const parsed = videoPartsInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(
    async () => {
      await requireVideoManager(parsed.data.videoId);
      return { parts: await training.signParts(parsed.data) };
    },
    { revalidate: false },
  );
}

export async function uploadedVideoPartsAction(
  videoId: string,
): Promise<TrainingResult<{ parts: { partNumber: number; etag: string }[] }>> {
  const parsedId = id.safeParse(videoId);
  if (!parsedId.success) return INVALID;
  return attempt(
    async () => {
      await requireVideoManager(parsedId.data);
      return { parts: await training.uploadedParts(parsedId.data) };
    },
    { revalidate: false },
  );
}

export async function completeVideoUploadAction(
  input: unknown,
): Promise<TrainingResult<{ videoId: string }>> {
  const parsed = videoCompleteInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireVideoManager(parsed.data.videoId);
    return training.markUploaded(parsed.data, session.user.id);
  });
}

export async function abortVideoUploadAction(
  videoId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(videoId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireVideoManager(parsedId.data);
    await training.abortUpload(parsedId.data);
  });
}

export async function updateVideoAction(
  videoId: string,
  input: unknown,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(videoId);
  const parsed = videoUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    await requireVideoManager(parsedId.data);
    await training.updateVideo(parsedId.data, parsed.data);
  });
}

export async function retryVideoAction(
  videoId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(videoId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    const session = await requireVideoManager(parsedId.data);
    await training.retryVideo(parsedId.data, session.user.id);
  });
}

export async function setPosterFrameAction(
  videoId: string,
  seconds: unknown,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(videoId);
  const parsedSeconds = posterSecondsInput.safeParse(seconds);
  if (!parsedId.success || !parsedSeconds.success) return INVALID;
  return attempt(
    async () => {
      const session = await requireVideoManager(parsedId.data);
      await training.requestPosterFrame(
        parsedId.data,
        parsedSeconds.data,
        session.user.id,
      );
    },
    { revalidate: false },
  );
}

export async function setVideoArchivedAction(
  videoId: string,
  archived: boolean,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(videoId);
  if (!parsedId.success || typeof archived !== "boolean") return INVALID;
  return attempt(async () => {
    await requireVideoManager(parsedId.data);
    await training.setVideoArchived(parsedId.data, archived);
  });
}

export async function deleteVideoAction(
  videoId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(videoId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    const session = await requireVideoManager(parsedId.data);
    await training.deleteVideo(parsedId.data, session.user.id);
  });
}

export type VideoStatusView = {
  id: string;
  status: TrainingVideoStatusName;
  progress: number;
  failureCode: VideoFailureCode | null;
  durationSeconds: number | null;
  poster: string | null;
};

export async function videoStatusesAction(
  ids: unknown,
): Promise<TrainingResult<{ videos: VideoStatusView[] }>> {
  const parsed = videoIdsInput.safeParse(ids);
  if (!parsed.success) return INVALID;
  if (parsed.data.length === 0) return { ok: true, videos: [] };
  return attempt(
    async () => {
      const { session } = await requireAdminScope();
      const rows = await training.videoStatuses(parsed.data);
      const videos = rows
        .filter((row) => allowsAdmin(session.access, row.authority))
        .map((row): VideoStatusView => ({
          id: row.id,
          status: row.status,
          progress: row.progress,
          failureCode: row.failureCode as VideoFailureCode | null,
          durationSeconds: row.durationSeconds,
          poster: row.poster,
        }));
      return { videos };
    },
    { revalidate: false },
  );
}

const requireCourseManager = async (courseId: string) =>
  requireAdminOf(await training.courseAuthority(courseId));

const requireElementManager = async (elementId: string) =>
  requireAdminOf(await training.elementAuthority(elementId));

const requireQuestionManager = async (questionId: string) =>
  requireAdminOf(await training.questionAuthority(questionId));

export async function createCourseAction(
  input: unknown,
): Promise<TrainingResult<{ courseId: string }>> {
  const parsed = courseCreateInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const owner =
      parsed.data.kind === "family"
        ? parsed.data.owner
        : await training.familyOwner(parsed.data.familyId);
    const session = await requireCatalogueOwner(owner);
    const { courseId } = await training.createCourse(
      parsed.data,
      session.user.id,
    );
    return { courseId };
  });
}

export async function updateCourseAction(
  courseId: string,
  input: unknown,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(courseId);
  const parsed = courseUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    await requireCourseManager(parsedId.data);
    await training.updateCourse(parsedId.data, parsed.data);
  });
}

export async function deleteCourseAction(
  courseId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(courseId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireCourseManager(parsedId.data);
    await training.deleteCourse(parsedId.data);
  });
}

export async function createElementAction(
  input: unknown,
): Promise<TrainingResult<{ elementId: string; position: number }>> {
  const parsed = elementCreateInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    await requireCourseManager(parsed.data.courseId);
    const element = await training.createElement(parsed.data);
    return { elementId: element.id, position: element.position };
  });
}

export async function updateElementAction(
  elementId: string,
  input: unknown,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(elementId);
  const parsed = elementUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireElementManager(parsedId.data);
    await training.updateElement(parsedId.data, parsed.data, session.user.id);
  });
}

export async function deleteElementAction(
  elementId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(elementId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireElementManager(parsedId.data);
    await training.deleteElement(parsedId.data);
  });
}

export async function reorderElementsAction(
  input: unknown,
): Promise<TrainingResult> {
  const parsed = elementOrderInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    await requireCourseManager(parsed.data.courseId);
    await training.reorderElements(parsed.data);
  });
}

export type LibraryVideo = {
  id: string;
  title: string;
  language: string;
  status: TrainingVideoStatusName;
  progress: number;
  failureCode: VideoFailureCode | null;
  durationSeconds: number | null;
  poster: string | null;
  archived: boolean;
  createdAt: Date;
};

export async function courseVideosAction(
  courseId: string,
): Promise<TrainingResult<{ videos: LibraryVideo[] }>> {
  const parsedId = id.safeParse(courseId);
  if (!parsedId.success) return INVALID;
  return attempt(
    async () => {
      await requireCourseManager(parsedId.data);
      const rows = await training.courseVideoLibrary(parsedId.data);
      return {
        videos: rows
          .filter((row) => row.status !== "uploading")
          .map((row): LibraryVideo => ({
            id: row.id,
            title: row.title,
            language: row.language,
            status: row.status,
            progress: row.progress,
            failureCode: row.failureCode as VideoFailureCode | null,
            durationSeconds: row.durationSeconds,
            poster: training.posterOf(row),
            archived: row.archivedAt !== null,
            createdAt: row.createdAt,
          })),
      };
    },
    { revalidate: false },
  );
}

export async function createQuestionAction(
  elementId: string,
): Promise<TrainingResult<{ questionId: string }>> {
  const parsedId = id.safeParse(elementId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireElementManager(parsedId.data);
    const question = await training.createQuestion(parsedId.data);
    return { questionId: question.id };
  });
}

export type SavedQuestion = {
  options: { id: string; text: string; correct: boolean }[];
  issues: QuestionIssue[];
};

export async function saveQuestionAction(
  questionId: string,
  input: unknown,
): Promise<TrainingResult<SavedQuestion>> {
  const parsedId = id.safeParse(questionId);
  const parsed = questionSaveInput.safeParse(input);
  if (!parsedId.success || !parsed.success) return INVALID;
  return attempt(async () => {
    await requireQuestionManager(parsedId.data);
    const { question, issues } = await training.saveQuestion(
      parsedId.data,
      parsed.data,
    );
    return {
      options: question.options.map(({ id, text, correct }) => ({
        id,
        text,
        correct,
      })),
      issues,
    };
  });
}

export async function deleteQuestionAction(
  questionId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(questionId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireQuestionManager(parsedId.data);
    await training.deleteQuestion(parsedId.data);
  });
}

export async function reorderQuestionsAction(
  input: unknown,
): Promise<TrainingResult> {
  const parsed = questionOrderInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    await requireElementManager(parsed.data.elementId);
    await training.reorderQuestions(parsed.data);
  });
}

export async function previewQuizAction(
  elementId: string,
  answers: unknown,
  number: unknown = 0,
): Promise<TrainingResult<{ result: QuizResult }>> {
  const parsedId = id.safeParse(elementId);
  const parsed = quizAnswersInput.safeParse(answers);
  const parsedNumber = attemptNumber.safeParse(number);
  if (!parsedId.success || !parsed.success || !parsedNumber.success)
    return INVALID;
  return attempt(
    async () => {
      const { scope } = await requireAdminScope();
      const course = await training.getCourse(
        await training.elementCourseId(parsedId.data),
      );
      if (
        !course ||
        !training.familyVisibleTo(course.family, {
          countryIds: [
            ...scope.countries.map((country) => country.id),
            ...scope.chapters.map((chapter) => chapter.countryId),
          ],
          chapterIds: scope.chapters.map((chapter) => chapter.id),
        })
      )
        forbidden();
      return {
        result: await training.gradePreview(
          parsedId.data,
          parsed.data,
          parsedNumber.data,
        ),
      };
    },
    { revalidate: false },
  );
}

export async function requestAttachmentUploadAction(
  input: unknown,
): Promise<TrainingResult<{ key: string; url: string }>> {
  const parsed = uploadRequest.safeParse(input);
  if (!parsed.success) return INVALID;
  const { session } = await requireAdminScope();
  if (!withinUploadLimit(session.user.id))
    return { ok: false, error: "rateLimited" };
  return attempt(
    () => requestUpload(session.user.id, "trainingAttachment", parsed.data),
    { revalidate: false },
  );
}

export async function commitAttachmentUploadAction(
  input: unknown,
): Promise<TrainingResult<{ fileId: string }>> {
  const parsed = uploadCommit.safeParse(input);
  if (!parsed.success) return INVALID;
  const { session } = await requireAdminScope();
  return attempt(
    async () => {
      const file = await commitUpload(
        session.user.id,
        "trainingAttachment",
        parsed.data.key,
      );
      return { fileId: file.id };
    },
    { revalidate: false },
  );
}

export async function setRequirementAction(
  input: unknown,
): Promise<TrainingResult<{ requirementId: string }>> {
  const parsed = requirementInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(async () => {
    const session = await requireCatalogueOwner(parsed.data.owner);
    const requirement = await setTrainingRequirement(
      parsed.data,
      session.user.id,
    );
    revalidatePath("/", "layout");
    return { requirementId: requirement.id };
  });
}

export async function removeRequirementAction(
  requirementId: string,
): Promise<TrainingResult> {
  const parsedId = id.safeParse(requirementId);
  if (!parsedId.success) return INVALID;
  return attempt(async () => {
    await requireAdminOf(await training.requirementAuthority(parsedId.data));
    await training.removeRequirement(parsedId.data);
    revalidatePath("/", "layout");
  });
}

export async function requirementImpactAction(
  input: unknown,
): Promise<TrainingResult<{ pilots: number }>> {
  const parsed = requirementInput.safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(
    async () => {
      await requireCatalogueOwner(parsed.data.owner);
      return requirementImpact(parsed.data);
    },
    { revalidate: false },
  );
}

export async function setCourseRequiredAction(
  input: unknown,
): Promise<TrainingResult<{ required: boolean }>> {
  const parsed = courseRequiredInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const { familyId, required, scope } = parsed.data;
  return attempt(async () => {
    const owner = await ownerFor(scope, requirementOwnerOf);
    if (!owner) throw new DomainError("scopeAmbiguous");
    const session = await requireCatalogueOwner(owner);
    if (required)
      await setTrainingRequirement({ owner, familyId }, session.user.id);
    else await training.removeRequirementOf({ owner, familyId });
    revalidatePath("/", "layout");
    return { required };
  });
}

export async function courseRequiredImpactAction(
  input: unknown,
): Promise<TrainingResult<{ pilots: number }>> {
  const parsed = courseRequiredInput
    .pick({ familyId: true, scope: true })
    .safeParse(input);
  if (!parsed.success) return INVALID;
  return attempt(
    async () => {
      const owner = await ownerFor(parsed.data.scope, requirementOwnerOf);
      if (!owner) throw new DomainError("scopeAmbiguous");
      await requireCatalogueOwner(owner);
      return requirementImpact({ owner, familyId: parsed.data.familyId });
    },
    { revalidate: false },
  );
}
