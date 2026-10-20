import { randomBytes } from "node:crypto";
import { DomainError, isUniqueViolation, mapping } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type { AdminAuthority } from "@/lib/access";
import type { Prisma } from "@/generated/prisma";
import {
  drawQuestions,
  gradeAttempt,
  questionIssues,
  toAttemptView,
  type DrawnQuestion,
  type QuizQuestion,
} from "./grade";
import {
  BLANKET_EXEMPTION,
  effectiveRequirements,
  familyStatus,
  pickVariant,
  type FamilyStatus,
  type VariantFacts,
} from "./requirements";
import { elementGates, isReachable, nextOpenElement } from "./elements";
import { acceptHeartbeat } from "./watch";
import {
  catalogueSearchInput,
  courseCreateInput,
  courseUpdateInput,
  elementCreateInput,
  elementOrderInput,
  elementUpdateInput,
  heartbeatInput,
  MAX_ELEMENTS,
  MAX_QUESTIONS,
  questionOrderInput,
  questionSaveInput,
  quizAnswersInput,
  type CatalogueSearchInput,
  type CourseCreateInput,
  type CourseUpdateInput,
  type ElementCreateInput,
  type ElementKind,
  type ElementOrderInput,
  type ElementUpdateInput,
  type HeartbeatInput,
  type QuestionOrderInput,
  type QuestionSaveInput,
  type QuizAnswers,
  exemptionGrant,
  requirementInput,
  type ExemptionGrant,
  type RequirementInput,
} from "./schemas";
import {
  DEFAULT_MAX_DURATION_SECONDS,
  DEFAULT_MAX_UPLOAD_BYTES,
  PART_SIZE,
  ownerKey,
  partCountOf,
  posterSecondsInput,
  videoCompleteInput,
  videoIdsInput,
  videoPartsInput,
  videoCreateInput,
  videoSearchInput,
  videoUpdateInput,
  type CatalogueOwner,
  type RenditionRow,
  type VideoCompleteInput,
  type VideoFailureCode,
  type VideoPartsInput,
  type VideoCreateInput,
  type VideoSearchInput,
  type VideoUpdateInput,
} from "./schemas";
import {
  abortSourceUpload,
  deleteMedia,
  deleteSource,
  deleteStoredObject,
  finishSourceUpload,
  mediaPrefixOf,
  signSourceParts,
  sourceKeyOf,
  sourceSize,
  startSourceUpload,
  uploadedSourceParts,
} from "./services/storage";
import {
  deleteVideoById,
  findStaleUploads,
  findVideoById,
  findVideoStatuses,
  findVideos,
  findVideosOfOwners,
  insertVideo,
  updateVideoById,
  updateVideoWhere,
  type TrainingVideoRow,
  type VideoStatusRow,
} from "./services/videos";
import {
  countCourseConsequences,
  deleteCourseById,
  findCourseById,
  findPublishedCourses,
  findPublishedCoursesOfFamilies,
  insertCourse,
  updateCourseById,
  type CourseRow,
} from "./services/courses";
import {
  deleteEmptyFamily,
  findFamilies,
  findFamilyById,
  insertFamily,
  type FamilyOwnerRow,
} from "./services/families";
import {
  countLessonsUsingVideo,
  deleteLessonById,
  deleteStoredFilesById,
  findAttachmentsOfOwners,
  findAttachmentLesson,
  findLessonById,
  findLessonsOfCourse,
  findLessonsOfCourses,
  findStoredFile,
  insertLessonAt,
  setLessonPositions,
  updateLessonById,
  type LessonRow,
  type LessonSummaryRow,
} from "./services/lessons";
import {
  completeElementOnce,
  countAttempt,
  findCompletedLessonIds,
  findCompletionsOfUsers,
  findEnrollmentId,
  findEnrollments,
  findEnrollmentsOfUsers,
  findLatestAttempt,
  findOneProgress,
  findProgress,
  insertAttempt,
  markPassedOnce,
  submitAttemptRow,
  touchEnrollment,
  upsertProgress,
  type EnrollmentRow,
} from "./services/progress";
import type { ActiveOwner } from "./scope-owner";
import {
  deleteRequirementById,
  deleteRequirementWhere,
  findRequirementById,
  findRequirementList,
  findRequirements,
  upsertRequirement,
  type RequirementListRow,
  type RequirementRow,
} from "./services/requirements";
import {
  deleteExemption,
  findExemption,
  findExemptions,
  insertExemption,
  type ExemptionRow,
} from "./services/exemptions";
import {
  deleteQuestionById,
  findQuestionById,
  findQuestions,
  findQuestionsOfLessons,
  insertQuestion,
  maxQuestionPosition,
  replaceQuestion,
  setQuestionPositions,
} from "./services/quiz";

export type {
  CourseRow,
  EnrollmentRow,
  ExemptionRow,
  RequirementListRow,
  RequirementRow,
  FamilyOwnerRow,
  LessonRow,
  TrainingVideoRow,
  VideoStatusRow,
};

export type Authority = AdminAuthority;

const NO_ONE: Authority = { chapters: [], countryIds: [] };

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

const positiveEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const maxUploadBytes = () =>
  positiveEnv("TRAINING_MAX_UPLOAD_BYTES", DEFAULT_MAX_UPLOAD_BYTES);

export const maxDurationSeconds = () =>
  positiveEnv("TRAINING_MAX_DURATION_SECONDS", DEFAULT_MAX_DURATION_SECONDS);

export function newMediaKey() {
  const bytes = randomBytes(16);
  let bits = 0;
  let value = 0;
  let key = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      key += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) key += BASE32[(value << (5 - bits)) & 31];
  return key;
}

const ownerColumns = (owner: CatalogueOwner) => ({
  scope: owner.scope,
  scopeKey: ownerKey(owner),
  countryId: owner.scope === "country" ? owner.countryId : null,
  chapterId: owner.scope === "chapter" ? owner.chapterId : null,
});

export const ownerOf = (video: TrainingVideoRow): CatalogueOwner =>
  video.scope === "chapter"
    ? { scope: "chapter", chapterId: video.chapterId! }
    : video.scope === "country"
      ? { scope: "country", countryId: video.countryId! }
      : { scope: "global" };

const posterStamp = (seconds: number) => Math.round(seconds * 1000);

export const posterKeys = (
  mediaKey: string,
  revision: number,
  seconds: number,
) => {
  const base = `${mediaPrefixOf(mediaKey, revision)}poster-${posterStamp(seconds)}`;
  return { large: `${base}.webp`, small: `${base}-480.webp` };
};

export const mediaKeyOf = (mediaKey: string, revision: number, path: string) =>
  `${mediaPrefixOf(mediaKey, revision)}${path}`;

const publicBase = () =>
  (process.env.MEDIA_PUBLIC_URL ?? "").replace(/\/+$/, "");

export type Playback = { src: string; poster: string; posterSmall: string };

export function playbackOf(video: {
  status: string;
  mediaKey: string;
  revision: number;
  posterSeconds: number | null;
}): Playback | null {
  if (video.status !== "ready" || video.posterSeconds === null) return null;
  const base = publicBase();
  const poster = posterKeys(
    video.mediaKey,
    video.revision,
    video.posterSeconds,
  );
  return {
    src: `${base}/${mediaKeyOf(video.mediaKey, video.revision, "master.m3u8")}`,
    poster: `${base}/${poster.large}`,
    posterSmall: `${base}/${poster.small}`,
  };
}

export function posterOf(video: {
  status: string;
  mediaKey: string;
  revision: number;
  posterSeconds: number | null;
}) {
  return playbackOf(video)?.posterSmall ?? null;
}

export function listVideosVisibleTo(input: VideoSearchInput) {
  const { countryIds, chapterIds, includeArchived } =
    videoSearchInput.parse(input);
  return findVideos({
    OR: [
      { scope: "global" },
      { scope: "country", countryId: { in: countryIds } },
      { scope: "chapter", chapterId: { in: chapterIds } },
    ],
    ...(includeArchived ? {} : { archivedAt: null }),
  });
}

export const getVideo = (id: string) => findVideoById(id);

async function requireVideo(id: string) {
  const video = await findVideoById(id);
  if (!video) throw new DomainError("unknownTrainingVideo");
  return video;
}

const authorityOf = (video: {
  scope: string;
  countryId: string | null;
  chapterId: string | null;
  chapter: { countryId: string } | null;
}): Authority => {
  if (video.scope === "country")
    return { chapters: [], countryIds: [video.countryId!] };
  if (video.scope === "chapter")
    return {
      chapters: [
        { chapterId: video.chapterId!, countryId: video.chapter!.countryId },
      ],
      countryIds: [],
    };
  return NO_ONE;
};

export const familyAuthority = (family: OwnerColumns): Authority =>
  authorityOf(family);

export const videoAuthority = async (id: string) =>
  authorityOf(await requireVideo(id));

export async function createVideo(
  input: VideoCreateInput,
  actorUserId: string,
) {
  const { owner, language, title, mime, size } = videoCreateInput.parse(input);
  if (size > maxUploadBytes()) throw new DomainError("uploadRejected");

  const mediaKey = newMediaKey();
  const sourceKey = sourceKeyOf(mediaKey);
  const uploadId = await startSourceUpload(sourceKey, mime);
  try {
    const video = await insertVideo({
      ...ownerColumns(owner),
      language,
      title,
      sourceKey,
      sourceMime: mime,
      sourceSize: BigInt(size),
      uploadId,
      mediaKey,
      uploadedByUserId: actorUserId,
    });
    return {
      videoId: video.id,
      partSize: PART_SIZE,
      partCount: partCountOf(size),
    };
  } catch (error) {
    await abortSourceUpload(sourceKey, uploadId);
    throw error;
  }
}

async function requireUploading(id: string) {
  const video = await requireVideo(id);
  if (video.status !== "uploading" || !video.uploadId)
    throw new DomainError("videoNotUploading");
  return { ...video, uploadId: video.uploadId };
}

export async function signParts(input: VideoPartsInput) {
  const { videoId, partNumbers } = videoPartsInput.parse(input);
  const video = await requireUploading(videoId);
  const count = partCountOf(Number(video.sourceSize));
  if (partNumbers.some((part) => part > count))
    throw new DomainError("uploadRejected");
  return signSourceParts(video.sourceKey, video.uploadId, partNumbers);
}

export async function uploadedParts(videoId: string) {
  const video = await requireUploading(videoId);
  return uploadedSourceParts(video.sourceKey, video.uploadId);
}

export async function markUploaded(
  input: VideoCompleteInput,
  actorUserId: string,
) {
  const { videoId, parts } = videoCompleteInput.parse(input);
  const video = await requireUploading(videoId);
  const expected = partCountOf(Number(video.sourceSize));
  const numbers = new Set(parts.map((part) => part.partNumber));
  if (
    numbers.size !== expected ||
    parts.some((part) => part.partNumber > expected)
  )
    throw new DomainError("uploadRejected");

  await finishSourceUpload(video.sourceKey, video.uploadId, parts);
  const size = await sourceSize(video.sourceKey);
  if (size === null || BigInt(size) !== video.sourceSize) {
    await deleteVideo(videoId, actorUserId);
    throw new DomainError("uploadRejected");
  }

  return transaction(async (tx, emit) => {
    const moved = await updateVideoWhere(
      { id: videoId, status: "uploading" },
      { status: "queued", uploadId: null, progress: 0, failureCode: null },
      tx,
    );
    if (!moved) throw new DomainError("videoNotUploading");
    await emit({
      type: "trainingVideo.uploaded",
      videoId,
      revision: video.revision,
      chapterId: video.chapterId,
      actorUserId,
    });
    return { videoId };
  });
}

export async function abortUpload(videoId: string) {
  const video = await requireUploading(videoId);
  await abortSourceUpload(video.sourceKey, video.uploadId);
  await deleteVideoById(videoId);
}

export type TranscodeContext = {
  videoId: string;
  revision: number;
  sourceKey: string;
  mediaKey: string;
  maxBytes: number;
  maxDurationSeconds: number;
};

export async function markProcessing(
  videoId: string,
  revision: number,
): Promise<TranscodeContext | null> {
  const moved = await updateVideoWhere(
    { id: videoId, revision, status: { in: ["queued", "processing"] } },
    { status: "processing", progress: 0, failureCode: null },
  );
  if (!moved) return null;
  const video = await requireVideo(videoId);
  return {
    videoId,
    revision,
    sourceKey: video.sourceKey,
    mediaKey: video.mediaKey,
    maxBytes: Number(video.sourceSize),
    maxDurationSeconds: maxDurationSeconds(),
  };
}

export const setProgress = (
  videoId: string,
  revision: number,
  percent: number,
) =>
  updateVideoWhere(
    { id: videoId, revision, status: "processing" },
    { progress: Math.max(0, Math.min(99, Math.round(percent))) },
  );

export type ReadyFacts = {
  durationSeconds: number;
  width: number;
  height: number;
  renditions: RenditionRow[];
  posterSeconds: number;
};

export const markReady = (
  videoId: string,
  revision: number,
  facts: ReadyFacts,
) =>
  updateVideoWhere(
    { id: videoId, revision, status: "processing" },
    {
      status: "ready",
      progress: 100,
      failureCode: null,
      durationSeconds: facts.durationSeconds,
      width: facts.width,
      height: facts.height,
      renditions: facts.renditions as Prisma.InputJsonArray,
      posterSeconds: facts.posterSeconds,
      readyAt: new Date(),
    },
  );

export const markFailed = (
  videoId: string,
  revision: number,
  code: VideoFailureCode,
) =>
  updateVideoWhere(
    { id: videoId, revision, status: { in: ["queued", "processing"] } },
    { status: "failed", failureCode: code, progress: 0 },
  );

export async function retryVideo(videoId: string, actorUserId: string) {
  const video = await requireVideo(videoId);
  if (video.status !== "failed") throw new DomainError("videoNotFailed");
  const revision = video.revision + 1;
  return transaction(async (tx, emit) => {
    const moved = await updateVideoWhere(
      { id: videoId, status: "failed", revision: video.revision },
      { status: "queued", revision, progress: 0, failureCode: null },
      tx,
    );
    if (!moved) throw new DomainError("videoNotFailed");
    await emit({
      type: "trainingVideo.uploaded",
      videoId,
      revision,
      chapterId: video.chapterId,
      actorUserId,
    });
  });
}

export async function requestPosterFrame(
  videoId: string,
  seconds: number,
  actorUserId: string,
) {
  const video = await requireVideo(videoId);
  if (video.status !== "ready" || video.durationSeconds === null)
    throw new DomainError("videoNotReady");
  const at = Math.min(posterSecondsInput.parse(seconds), video.durationSeconds);
  await transaction((_tx, emit) =>
    emit({
      type: "trainingVideo.posterRequested",
      videoId,
      revision: video.revision,
      seconds: at,
      chapterId: video.chapterId,
      actorUserId,
    }),
  );
}

export const setPoster = (videoId: string, revision: number, seconds: number) =>
  updateVideoWhere(
    { id: videoId, revision, status: "ready" },
    { posterSeconds: seconds },
  );

export async function posterContext(videoId: string, revision: number) {
  const video = await findVideoById(videoId);
  if (!video || video.revision !== revision || video.status !== "ready")
    return null;
  return {
    videoId,
    revision,
    mediaKey: video.mediaKey,
    renditions: (video.renditions ?? []) as RenditionRow[],
  };
}

export async function updateVideo(videoId: string, input: VideoUpdateInput) {
  await requireVideo(videoId);
  return updateVideoById(videoId, videoUpdateInput.parse(input));
}

export async function setVideoArchived(videoId: string, archived: boolean) {
  await requireVideo(videoId);
  return updateVideoById(videoId, { archivedAt: archived ? new Date() : null });
}

export async function deleteVideo(videoId: string, actorUserId: string) {
  const video = await requireVideo(videoId);
  if ((await countLessonsUsingVideo(videoId)) > 0)
    throw new DomainError("videoInUse");
  await transaction(async (tx, emit) => {
    await deleteVideoById(videoId, tx);
    await emit({
      type: "trainingVideo.deleted",
      videoId,
      mediaKey: video.mediaKey,
      sourceKey: video.sourceKey,
      uploadId: video.uploadId,
      chapterId: video.chapterId,
      actorUserId,
    });
  });
}

export async function purgeVideoFiles(input: {
  mediaKey: string;
  sourceKey: string;
  uploadId: string | null;
}) {
  if (input.uploadId) await abortSourceUpload(input.sourceKey, input.uploadId);
  await deleteSource(input.sourceKey);
  return deleteMedia(input.mediaKey);
}

export const purgeRevision = (mediaKey: string, revision: number) =>
  deleteMedia(mediaKey, revision);

export async function videoStatuses(ids: string[]) {
  const rows = await findVideoStatuses(videoIdsInput.parse(ids));
  return rows.map((row) => ({
    authority: authorityOf(row),
    id: row.id,
    status: row.status,
    progress: row.progress,
    failureCode: row.failureCode,
    durationSeconds: row.durationSeconds,
    poster: posterOf(row),
  }));
}

const STALE_UPLOAD_MS = 24 * 60 * 60_000;
const PRUNE_BATCH = 100;

export async function pruneStaleUploads(now = new Date()) {
  const stale = await findStaleUploads(
    new Date(now.getTime() - STALE_UPLOAD_MS),
    PRUNE_BATCH,
  );
  for (const video of stale) {
    if (video.uploadId)
      await abortSourceUpload(video.sourceKey, video.uploadId);
    await deleteVideoById(video.id).catch(() => undefined);
  }
  return stale.length;
}

async function settled<T>(write: () => Promise<T>) {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error)) return write();
    throw error;
  }
}

export type ChapterContext = { chapterId: string; countryId: string };
export type ReadinessChapter = { chapterId: string; countryId: string | null };

type OwnerColumns = {
  scope: string;
  countryId: string | null;
  chapterId: string | null;
  chapter: { countryId: string } | null;
};

export const familyOwnerOf = (family: OwnerColumns): CatalogueOwner =>
  family.scope === "chapter"
    ? { scope: "chapter", chapterId: family.chapterId! }
    : family.scope === "country"
      ? { scope: "country", countryId: family.countryId! }
      : { scope: "global" };

export const ownerNameOfFamily = (family: FamilyOwnerRow) =>
  family.scope === "country"
    ? (family.country?.name ?? null)
    : family.scope === "chapter"
      ? (family.chapter?.name ?? null)
      : null;

export const familyVisibleTo = (
  family: OwnerColumns,
  search: CatalogueSearchInput,
) =>
  family.scope === "global" ||
  (family.scope === "country" &&
    search.countryIds.includes(family.countryId!)) ||
  (family.scope === "chapter" && search.chapterIds.includes(family.chapterId!));

export const familyVisibleToChapter = (
  family: OwnerColumns,
  chapter: ChapterContext,
) =>
  familyVisibleTo(family, {
    countryIds: [chapter.countryId],
    chapterIds: [chapter.chapterId],
  });

const familyWhere = ({ countryIds, chapterIds }: CatalogueSearchInput) => ({
  OR: [
    { scope: "global" as const },
    { scope: "country" as const, countryId: { in: countryIds } },
    { scope: "chapter" as const, chapterId: { in: chapterIds } },
  ],
});

export const listCourseFamilies = (input: CatalogueSearchInput) =>
  findFamilies(familyWhere(catalogueSearchInput.parse(input)));

export const getCourse = (courseId: string) => findCourseById(courseId);

async function requireCourse(courseId: string) {
  const course = await findCourseById(courseId);
  if (!course) throw new DomainError("unknownTrainingCourse");
  return course;
}

export const courseAuthority = async (courseId: string) =>
  authorityOf((await requireCourse(courseId)).family);

async function requireElement(elementId: string) {
  const element = await findLessonById(elementId);
  if (!element) throw new DomainError("unknownTrainingLesson");
  return element;
}

async function requireQuizElement(elementId: string) {
  const element = await requireElement(elementId);
  if (element.kind !== "quiz") throw new DomainError("elementKindMismatch");
  return element;
}

export const elementAuthority = async (elementId: string) =>
  courseAuthority((await requireElement(elementId)).courseId);

export const elementCourseId = async (elementId: string) =>
  (await requireElement(elementId)).courseId;

async function requireQuestion(questionId: string) {
  const question = await findQuestionById(questionId);
  if (!question) throw new DomainError("unknownTrainingQuestion");
  return question;
}

export const questionAuthority = async (questionId: string) =>
  elementAuthority((await requireQuestion(questionId)).lessonId);

export const questionElementId = async (questionId: string) =>
  (await requireQuestion(questionId)).lessonId;

export async function createCourse(
  input: CourseCreateInput,
  actorUserId: string,
) {
  const data = courseCreateInput.parse(input);
  return mapping(
    () =>
      transaction(async (tx) => {
        const familyId =
          data.kind === "family"
            ? (
                await insertFamily(
                  {
                    ...ownerColumns(data.owner),
                    createdByUserId: actorUserId,
                  },
                  tx,
                )
              ).id
            : data.familyId;
        const course = await insertCourse(
          {
            familyId,
            language: data.language,
            title: data.title,
            createdByUserId: actorUserId,
          },
          tx,
        );
        return { courseId: course.id, familyId };
      }),
    {
      unique: "courseLanguageTaken",
      missingRelation: "unknownTrainingCourse",
    },
  );
}

export async function familyOwner(familyId: string) {
  const family = await findFamilyById(familyId);
  if (!family) throw new DomainError("unknownTrainingCourse");
  return familyOwnerOf(family);
}

async function assertPublishable(courseId: string) {
  const elements = await findLessonsOfCourse(courseId);
  if (elements.length === 0) throw new DomainError("courseEmpty");
  const quizIds = elements
    .filter((element) => element.kind === "quiz")
    .map((element) => element.id);
  if (quizIds.length === 0) return;
  const questions = await findQuestionsOfLessons(quizIds);
  if (
    quizIds.some((quizId) => !questions.some((q) => q.lessonId === quizId)) ||
    questions.some((question) => questionIssues(question).length > 0)
  )
    throw new DomainError("quizInvalid");
}

export async function updateCourse(courseId: string, input: CourseUpdateInput) {
  const course = await requireCourse(courseId);
  const { published, ...data } = courseUpdateInput.parse(input);
  if (published === true && !course.publishedAt)
    await assertPublishable(courseId);
  return updateCourseById(courseId, {
    ...data,
    ...(published === undefined
      ? {}
      : { publishedAt: published ? (course.publishedAt ?? new Date()) : null }),
  });
}

export const courseConsequences = (courseId: string) =>
  countCourseConsequences(courseId);

export async function deleteCourse(courseId: string) {
  await requireCourse(courseId);
  await transaction(async (tx) => {
    const { familyId } = await deleteCourseById(courseId, tx);
    await deleteEmptyFamily(familyId, tx);
  });
}

export type ElementView = {
  id: string;
  courseId: string;
  kind: ElementKind;
  position: number;
  title: string;
  body: string | null;
  videoId: string | null;
  attachmentFileId: string | null;
  quizShuffle: boolean;
  quizDrawCount: number | null;
  questionCount: number;
  durationSeconds: number | null;
  poster: string | null;
  video: LessonRow["video"];
  updatedAt: Date;
};

const elementViewOf = (row: LessonRow): ElementView => ({
  id: row.id,
  courseId: row.courseId,
  kind: row.kind,
  position: row.position,
  title: row.title,
  body: row.body,
  videoId: row.videoId,
  attachmentFileId: row.attachmentFileId,
  quizShuffle: row.quizShuffle,
  quizDrawCount: row.quizDrawCount,
  questionCount: row._count.questions,
  durationSeconds: row.video?.durationSeconds ?? null,
  poster: row.video ? posterOf(row.video) : null,
  video: row.video,
  updatedAt: row.updatedAt,
});

export const courseElements = async (courseId: string) =>
  (await findLessonsOfCourse(courseId)).map(elementViewOf);

export async function getElement(elementId: string) {
  const row = await findLessonById(elementId);
  return row ? elementViewOf(row) : null;
}

export async function createElement(input: ElementCreateInput) {
  const { courseId, kind, title, position } = elementCreateInput.parse(input);
  await requireCourse(courseId);
  if ((await findLessonsOfCourse(courseId)).length >= MAX_ELEMENTS)
    throw new DomainError("courseFull");
  return insertLessonAt({ courseId, kind, title }, position);
}

export function videoSearchFor(course: CourseRow): CatalogueSearchInput {
  const family = course.family;
  if (family.scope === "chapter")
    return {
      countryIds: family.chapter ? [family.chapter.countryId] : [],
      chapterIds: [family.chapterId!],
    };
  if (family.scope === "country")
    return { countryIds: [family.countryId!], chapterIds: [] };
  return { countryIds: [], chapterIds: [] };
}

export async function videoChoices(elementId: string) {
  const element = await requireElement(elementId);
  const course = await requireCourse(element.courseId);
  const videos = await listVideosVisibleTo(videoSearchFor(course));
  return videos.filter((video) => video.status === "ready");
}

export async function courseVideoLibrary(courseId: string) {
  const course = await requireCourse(courseId);
  return listVideosVisibleTo(videoSearchFor(course));
}

async function assertVideoAllowed(
  videoId: string,
  element: LessonRow,
  course: CourseRow,
) {
  const video = await findVideoById(videoId);
  if (!video) throw new DomainError("unknownTrainingVideo");
  if (video.status !== "ready") throw new DomainError("videoNotReady");
  if (video.archivedAt && video.id !== element.videoId)
    throw new DomainError("videoNotAllowed");
  if (!familyVisibleTo(video, videoSearchFor(course)))
    throw new DomainError("videoNotAllowed");
}

async function assertOwnAttachment(fileId: string, actorUserId: string) {
  const file = await findStoredFile(fileId);
  if (
    !file ||
    file.kind !== "trainingAttachment" ||
    file.uploadedByUserId !== actorUserId
  )
    throw new DomainError("invalidFile");
}

const LESSON_ONLY = ["videoId", "attachmentFileId"] as const;
const QUIZ_ONLY = ["quizShuffle", "quizDrawCount"] as const;

export async function updateElement(
  elementId: string,
  input: ElementUpdateInput,
  actorUserId: string,
) {
  const element = await requireElement(elementId);
  const data = elementUpdateInput.parse(input);
  const foreign = element.kind === "quiz" ? LESSON_ONLY : QUIZ_ONLY;
  if (foreign.some((key) => data[key] !== undefined && data[key] !== null))
    throw new DomainError("elementKindMismatch");
  if (data.videoId && data.videoId !== element.videoId)
    await assertVideoAllowed(
      data.videoId,
      element,
      await requireCourse(element.courseId),
    );
  if (
    data.attachmentFileId &&
    data.attachmentFileId !== element.attachmentFileId
  )
    await assertOwnAttachment(data.attachmentFileId, actorUserId);
  return updateLessonById(elementId, data);
}

export async function deleteElement(elementId: string) {
  await requireElement(elementId);
  await deleteLessonById(elementId);
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length &&
  new Set(b).size === b.length &&
  a.every((id) => b.includes(id));

export async function reorderElements(input: ElementOrderInput) {
  const { courseId, elementIds } = elementOrderInput.parse(input);
  const elements = await findLessonsOfCourse(courseId);
  if (
    !sameSet(
      elements.map((element) => element.id),
      elementIds,
    )
  )
    throw new DomainError("unknownTrainingLesson");
  await setLessonPositions(elementIds);
}

export const listQuestions = (elementId: string) => findQuestions(elementId);

export async function createQuestion(elementId: string) {
  await requireQuizElement(elementId);
  const position = (await maxQuestionPosition(elementId)) + 1;
  if (position >= MAX_QUESTIONS) throw new DomainError("quizFull");
  return insertQuestion({
    lessonId: elementId,
    position,
    kind: "single",
    prompt: "",
    options: {
      create: [
        { position: 0, text: "", correct: true },
        { position: 1, text: "", correct: false },
      ],
    },
  });
}

export async function saveQuestion(
  questionId: string,
  input: QuestionSaveInput,
) {
  const question = await requireQuestion(questionId);
  const data = questionSaveInput.parse(input);
  const known = new Set(question.options.map((option) => option.id));
  if (data.options.some((option) => option.id && !known.has(option.id)))
    throw new DomainError("unknownTrainingQuestion");
  const saved = await replaceQuestion(questionId, data);
  return { question: saved, issues: questionIssues(saved) };
}

export async function deleteQuestion(questionId: string) {
  await requireQuestion(questionId);
  await deleteQuestionById(questionId);
}

export async function reorderQuestions(input: QuestionOrderInput) {
  const { elementId, questionIds } = questionOrderInput.parse(input);
  const questions = await findQuestions(elementId);
  if (
    !sameSet(
      questions.map((question) => question.id),
      questionIds,
    )
  )
    throw new DomainError("unknownTrainingQuestion");
  await setQuestionPositions(questionIds);
}

export const publishedCourses = (search: CatalogueSearchInput) =>
  findPublishedCourses(familyWhere(catalogueSearchInput.parse(search)));

export type CourseOutlineElement = {
  id: string;
  courseId: string;
  kind: ElementKind;
  title: string;
  durationSeconds: number | null;
  poster: string | null;
  posterLarge: string | null;
  hasVideo: boolean;
  questionCount: number;
};

const outlineOf = (element: LessonSummaryRow): CourseOutlineElement => {
  const playable = element.video?.status === "ready" ? element.video : null;
  const playback = playable ? playbackOf(playable) : null;
  return {
    id: element.id,
    courseId: element.courseId,
    kind: element.kind,
    title: element.title,
    durationSeconds: playable?.durationSeconds ?? null,
    poster: playback?.posterSmall ?? null,
    posterLarge: playback?.poster ?? null,
    hasVideo: playable !== null,
    questionCount: element._count.questions,
  };
};

export async function outlinesFor(courseIds: string[]) {
  const result = new Map<string, CourseOutlineElement[]>();
  const unique = uniq(courseIds);
  if (unique.length === 0) return result;
  for (const element of await findLessonsOfCourses(unique))
    result.set(element.courseId, [
      ...(result.get(element.courseId) ?? []),
      outlineOf(element),
    ]);
  return result;
}

export type LessonProgressView = {
  lessonId: string;
  furthestSeconds: number;
  positionSeconds: number;
  completed: boolean;
};

export async function progressOf(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return new Map<string, LessonProgressView>();
  const rows = await findProgress(userId, lessonIds);
  return new Map(
    rows.map((row) => [
      row.lessonId,
      {
        lessonId: row.lessonId,
        furthestSeconds: row.furthestSeconds,
        positionSeconds: row.positionSeconds,
        completed: row.completedAt !== null,
      },
    ]),
  );
}

export async function enrollmentsOf(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) return new Map<string, EnrollmentRow>();
  const rows = await findEnrollments(userId, courseIds);
  return new Map(rows.map((row) => [row.courseId, row]));
}

export async function lessonForLearner(lessonId: string) {
  const lesson = await findLessonById(lessonId);
  if (!lesson) return null;
  const playable = lesson.video?.status === "ready" ? lesson.video : null;
  return {
    id: lesson.id,
    courseId: lesson.courseId,
    kind: lesson.kind,
    title: lesson.title,
    body: lesson.body,
    attachmentFileId: lesson.attachmentFileId,
    durationSeconds: playable?.durationSeconds ?? null,
    playback: playable ? playbackOf(playable) : null,
  };
}

export type LearnerLesson = NonNullable<
  Awaited<ReturnType<typeof lessonForLearner>>
>;

type LearnerElement = {
  id: string;
  courseId: string;
  kind: ElementKind;
  durationSeconds: number | null;
};

async function gatesOf(userId: string, courseId: string) {
  const elements = await findLessonsOfCourse(courseId);
  const ids = elements.map((element) => element.id);
  const done = new Set(await findCompletedLessonIds(userId, ids));
  return elementGates(
    elements.map((element) => ({
      id: element.id,
      kind: element.kind,
      completed: done.has(element.id),
    })),
  );
}

async function assertReachable(
  userId: string,
  element: { id: string; courseId: string },
) {
  const gates = await gatesOf(userId, element.courseId);
  const gate = gates.find((row) => row.id === element.id);
  if (!gate) throw new DomainError("unknownTrainingLesson");
  if (!isReachable(gate)) throw new DomainError("quizLocked");
  return gates;
}

type PassContext = {
  userId: string;
  courseId: string;
  chapterId: string | null;
  attemptId: string | null;
  now: Date;
};

async function passIfComplete(
  tx: Prisma.TransactionClient,
  emit: Parameters<Parameters<typeof transaction>[0]>[1],
  context: PassContext,
) {
  const elements = await findLessonsOfCourse(context.courseId);
  const ids = elements.map((element) => element.id);
  const done = await findCompletedLessonIds(context.userId, ids, tx);
  if (ids.length === 0 || done.length < ids.length) return false;
  const enrollment = await findEnrollmentId(
    context.userId,
    context.courseId,
    tx,
  );
  if (!enrollment) return false;
  const marked = await markPassedOnce(tx, enrollment.id, context.now);
  if (marked.count === 0) return false;
  const course = await requireCourse(context.courseId);
  await emit({
    type: "training.coursePassed",
    userId: context.userId,
    courseId: context.courseId,
    familyId: course.familyId,
    attemptId: context.attemptId,
    chapterId: context.chapterId,
    actorUserId: context.userId,
  });
  return true;
}

const settleCourse = (context: PassContext) =>
  transaction((tx, emit) => passIfComplete(tx, emit, context));

export async function recordHeartbeat(
  userId: string,
  lesson: LearnerElement,
  beat: HeartbeatInput,
  chapterId: string | null = null,
  now = new Date(),
) {
  const { position, furthest } = heartbeatInput.parse({
    ...beat,
    lessonId: lesson.id,
  });
  if (lesson.kind !== "lesson") throw new DomainError("elementKindMismatch");
  if (!lesson.durationSeconds) return { completed: false };
  await assertReachable(userId, lesson);
  const previous = await findOneProgress(userId, lesson.id);
  const next = acceptHeartbeat(
    previous,
    { position, furthest },
    lesson.durationSeconds,
    now,
  );
  await settled(() => upsertProgress(userId, lesson.id, next));
  await settled(() => touchEnrollment(userId, lesson.courseId, lesson.id, now));
  if (next.completedAt && !previous?.completedAt)
    await settleCourse({
      userId,
      courseId: lesson.courseId,
      chapterId,
      attemptId: null,
      now,
    });
  return { completed: next.completedAt !== null };
}

export async function acknowledgeLesson(
  userId: string,
  lesson: LearnerElement,
  chapterId: string | null = null,
  now = new Date(),
) {
  if (lesson.kind !== "lesson") throw new DomainError("elementKindMismatch");
  if (lesson.durationSeconds) return { completed: false };
  await assertReachable(userId, lesson);
  const previous = await findOneProgress(userId, lesson.id);
  if (!previous?.completedAt)
    await settled(() =>
      upsertProgress(userId, lesson.id, {
        furthestSeconds: 0,
        positionSeconds: 0,
        heartbeatAt: now,
        completedAt: now,
      }),
    );
  await settled(() => touchEnrollment(userId, lesson.courseId, lesson.id, now));
  if (!previous?.completedAt)
    await settleCourse({
      userId,
      courseId: lesson.courseId,
      chapterId,
      attemptId: null,
      now,
    });
  return { completed: true };
}

const seedOf = (userId: string, elementId: string, number: number) =>
  `${userId}:${elementId}:${number}`;

type QuizSettings = {
  id: string;
  quizDrawCount: number | null;
  quizShuffle: boolean;
};

const drawFor = async (
  quiz: QuizSettings,
  questions: QuizQuestion[],
  seedUser: string,
  number: number,
) =>
  drawQuestions(
    questions,
    { drawCount: quiz.quizDrawCount, shuffle: quiz.quizShuffle },
    seedOf(seedUser, quiz.id, number),
  );

async function quizElement(elementId: string) {
  const element = await requireQuizElement(elementId);
  const questions = (await findQuestions(elementId)) as QuizQuestion[];
  return { element, questions };
}

const nextNumber = (
  latest: { number: number; submittedAt: Date | null } | null,
) => (latest ? (latest.submittedAt ? latest.number + 1 : latest.number) : 0);

export async function quizPreview(userId: string, elementId: string) {
  const { element, questions } = await quizElement(elementId);
  const [enrollments, progress] = await Promise.all([
    findEnrollments(userId, [element.courseId]),
    findOneProgress(userId, elementId),
  ]);
  const enrollment = enrollments[0] ?? null;
  const latest = enrollment
    ? await findLatestAttempt(enrollment.id, elementId)
    : null;
  const number = nextNumber(latest);
  const order = await drawFor(element, questions, userId, number);
  return {
    number,
    passedAt: progress?.completedAt ?? null,
    attempts: number,
    questions: toAttemptView(order, questions),
  };
}

export type QuizPreview = Awaited<ReturnType<typeof quizPreview>>;

async function openAttempt(userId: string, elementId: string) {
  const { element, questions } = await quizElement(elementId);
  await assertReachable(userId, element);
  const enrollment = await settled(() =>
    touchEnrollment(userId, element.courseId, elementId, new Date()),
  );
  const latest = await findLatestAttempt(enrollment.id, elementId);
  const attempt =
    latest && !latest.submittedAt
      ? latest
      : await (async () => {
          const number = nextNumber(latest);
          const order = await drawFor(element, questions, userId, number);
          return settled(() =>
            insertAttempt({
              enrollmentId: enrollment.id,
              userId,
              courseId: element.courseId,
              lessonId: elementId,
              number,
              questionOrder: order as unknown as Prisma.InputJsonArray,
              total: order.length,
            }),
          );
        })();
  return { element, questions, enrollment, attempt };
}

export async function startAttempt(userId: string, elementId: string) {
  const { questions, attempt } = await openAttempt(userId, elementId);
  return {
    number: attempt.number,
    questions: toAttemptView(
      attempt.questionOrder as unknown as DrawnQuestion[],
      questions,
    ),
  };
}

export type ReviewedQuestion = {
  id: string;
  kind: QuizQuestion["kind"];
  prompt: string;
  explanation: string | null;
  correct: boolean;
  selected: string[];
  options: { id: string; text: string; correct: boolean }[];
};

export async function submitAttempt(
  userId: string,
  elementId: string,
  answers: QuizAnswers,
  chapterId: string | null,
) {
  const parsed = quizAnswersInput.parse(answers);
  const { element, questions, enrollment, attempt } = await openAttempt(
    userId,
    elementId,
  );
  const order = attempt.questionOrder as unknown as DrawnQuestion[];
  const grade = gradeAttempt(order, questions, parsed);
  const now = new Date();

  const outcome = await transaction(async (tx, emit) => {
    const submitted = await submitAttemptRow(tx, attempt.id, {
      submittedAt: now,
      answers: parsed,
      correctCount: grade.correctCount,
      total: grade.total,
      passed: grade.passed,
    });
    if (submitted.count === 0) throw new DomainError("quizAttemptClosed");
    await countAttempt(tx, enrollment.id, now);
    if (!grade.passed) return { firstPass: false, coursePassed: false };
    const marked = await completeElementOnce(tx, userId, elementId, now);
    const coursePassed = await passIfComplete(tx, emit, {
      userId,
      courseId: element.courseId,
      chapterId,
      attemptId: attempt.id,
      now,
    });
    return { firstPass: marked.count > 0, coursePassed };
  });

  return {
    ...resultOf(
      order,
      questions,
      grade,
      outcome.firstPass,
      grade.passed
        ? null
        : await nextAttemptView(element, questions, userId, attempt.number + 1),
    ),
    coursePassed: outcome.coursePassed,
  };
}

async function nextAttemptView(
  quiz: QuizSettings,
  questions: QuizQuestion[],
  seedUser: string,
  number: number,
) {
  const order = await drawFor(quiz, questions, seedUser, number);
  return { number, questions: toAttemptView(order, questions) };
}

function resultOf(
  order: DrawnQuestion[],
  questions: QuizQuestion[],
  grade: ReturnType<typeof gradeAttempt>,
  firstPass: boolean,
  next: { number: number; questions: ReturnType<typeof toAttemptView> } | null,
) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const views = new Map(
    toAttemptView(order, questions).map((view) => [view.id, view]),
  );
  const reviewed: ReviewedQuestion[] = grade.questions.map((graded) => {
    const question = byId.get(graded.questionId)!;
    const correctIds = new Set(graded.correctOptionIds);
    return {
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      explanation: question.explanation,
      correct: graded.correct,
      selected: graded.selected,
      options: views.get(question.id)!.options.map((option) => ({
        ...option,
        correct: correctIds.has(option.id),
      })),
    };
  });
  return {
    passed: grade.passed,
    firstPass,
    coursePassed: false,
    correctCount: grade.correctCount,
    total: grade.total,
    questions: reviewed,
    next,
  };
}

const PREVIEW_SEED = "preview";

export async function previewQuiz(elementId: string, number = 0) {
  const { element, questions } = await quizElement(elementId);
  return nextAttemptView(element, questions, PREVIEW_SEED, number);
}

export async function gradePreview(
  elementId: string,
  answers: QuizAnswers,
  number = 0,
) {
  const parsed = quizAnswersInput.parse(answers);
  const { element, questions } = await quizElement(elementId);
  const order = await drawFor(element, questions, PREVIEW_SEED, number);
  const grade = gradeAttempt(order, questions, parsed);
  return resultOf(
    order,
    questions,
    grade,
    false,
    grade.passed
      ? null
      : await nextAttemptView(element, questions, PREVIEW_SEED, number + 1),
  );
}

export type QuizResult = Awaited<ReturnType<typeof submitAttempt>>;

export async function attachmentOf(fileId: string) {
  const file = await findStoredFile(fileId);
  if (!file || file.kind !== "trainingAttachment") return null;
  const lesson = await findAttachmentLesson(fileId);
  return {
    file: { id: file.id, key: file.key, mime: file.mime },
    uploadedByUserId: file.uploadedByUserId,
    lesson,
    authority: lesson ? await courseAuthority(lesson.courseId) : NO_ONE,
  };
}

export type RequirementView = {
  id: string;
  familyId: string;
  scope: "global" | "country" | "chapter";
  countryId: string | null;
  chapterId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

const requirementViewOf = (row: RequirementRow): RequirementView => ({
  id: row.id,
  familyId: row.familyId,
  scope: row.scope,
  countryId: row.countryId,
  chapterId: row.chapterId,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
});

async function requireRequirement(id: string) {
  const requirement = await findRequirementById(id);
  if (!requirement) throw new DomainError("unknownTrainingRequirement");
  return requirement;
}

export const requirementAuthority = async (id: string) =>
  authorityOf(await requireRequirement(id));

export const requirementOwner = async (id: string) =>
  familyOwnerOf(await requireRequirement(id));

export function familyAllowedFor(
  family: OwnerColumns,
  owner: CatalogueOwner,
  ownerChapter?: ChapterContext | null,
) {
  if (owner.scope === "global") return family.scope === "global";
  if (owner.scope === "country")
    return (
      family.scope === "global" ||
      (family.scope === "country" && family.countryId === owner.countryId)
    );
  if (!ownerChapter || ownerChapter.chapterId !== owner.chapterId) return false;
  return familyVisibleToChapter(family, ownerChapter);
}

export async function assertFamilyAllowed(
  familyId: string,
  owner: CatalogueOwner,
  ownerChapter?: ChapterContext | null,
) {
  const family = await findFamilyById(familyId);
  if (!family) throw new DomainError("unknownTrainingCourse");
  if (!familyAllowedFor(family, owner, ownerChapter))
    throw new DomainError("familyNotAllowed");
  return family;
}

export async function setRequirement(
  input: RequirementInput,
  actorUserId: string,
  ownerChapter?: ChapterContext | null,
) {
  const { owner, familyId } = requirementInput.parse(input);
  await assertFamilyAllowed(familyId, owner, ownerChapter);
  const row = await mapping(
    () =>
      settled(() =>
        upsertRequirement({
          ...ownerColumns(owner),
          familyId,
          createdByUserId: actorUserId,
        }),
      ),
    { missingRelation: "unknownTrainingCourse" },
  );
  return requirementViewOf(row);
}

export async function removeRequirement(id: string) {
  const { count } = await deleteRequirementById(id);
  if (count === 0) throw new DomainError("unknownTrainingRequirement");
}

const requirementWhere = ({
  countryIds,
  chapterIds,
}: CatalogueSearchInput) => ({
  OR: [
    { scope: "global" as const },
    { scope: "country" as const, countryId: { in: countryIds } },
    { scope: "chapter" as const, chapterId: { in: chapterIds } },
  ],
});

export type RequirementListItem = RequirementView & {
  ownerName: string | null;
  family: {
    id: string;
    scope: "global" | "country" | "chapter";
    countryId: string | null;
    chapterId: string | null;
    variants: {
      courseId: string;
      language: string;
      title: string;
      published: boolean;
    }[];
  };
  authority: Authority;
};

const listItemOf = (row: RequirementListRow): RequirementListItem => ({
  ...requirementViewOf(row),
  ownerName:
    row.scope === "country"
      ? (row.country?.name ?? null)
      : row.scope === "chapter"
        ? (row.chapter?.name ?? null)
        : null,
  family: {
    id: row.family.id,
    scope: row.family.scope,
    countryId: row.family.countryId,
    chapterId: row.family.chapterId,
    variants: row.family.courses.map((course) => ({
      courseId: course.id,
      language: course.language,
      title: course.title,
      published: course.publishedAt !== null,
    })),
  },
  authority: authorityOf(row),
});

export async function listRequirements(search: CatalogueSearchInput) {
  const rows = await findRequirementList(
    requirementWhere(catalogueSearchInput.parse(search)),
  );
  return rows.map(listItemOf);
}

export async function removeRequirementOf(input: RequirementInput) {
  const { owner, familyId } = requirementInput.parse(input);
  await deleteRequirementWhere({ scopeKey: ownerKey(owner), familyId });
}

export type RequirementRelation = "own" | "inherited" | "other";

export const requirementRelation = (
  requirement: {
    scope: "global" | "country" | "chapter";
    countryId: string | null;
    chapterId: string | null;
  },
  active: ActiveOwner | null,
): RequirementRelation => {
  if (!active) return "other";
  const { owner } = active;
  if (
    ownerKey(owner) ===
    ownerKey(
      requirement.scope === "chapter"
        ? { scope: "chapter", chapterId: requirement.chapterId! }
        : requirement.scope === "country"
          ? { scope: "country", countryId: requirement.countryId! }
          : { scope: "global" },
    )
  )
    return "own";
  if (requirement.scope === "global") return "inherited";
  if (
    requirement.scope === "country" &&
    owner.scope === "chapter" &&
    requirement.countryId === active.countryId
  )
    return "inherited";
  return "other";
};

export type CatalogueRequirement = {
  requirementId: string;
  scope: "global" | "country" | "chapter";
  countryId: string | null;
  chapterId: string | null;
  ownerName: string | null;
  relation: RequirementRelation;
};

export type CatalogueVariant = {
  courseId: string;
  language: string;
  title: string;
  summary: string | null;
  published: boolean;
  lessons: number;
  quizzes: number;
  updatedAt: Date;
};

export type CatalogueFamily = {
  familyId: string;
  scope: "global" | "country" | "chapter";
  countryId: string | null;
  chapterId: string | null;
  ownerName: string | null;
  authority: Authority;
  published: boolean;
  variants: CatalogueVariant[];
  required: boolean;
  requiredEffective: boolean;
  requirementId: string | null;
  requiredIn: CatalogueRequirement[];
};

export async function listCourseCatalogue(
  search: CatalogueSearchInput,
  active: ActiveOwner | null,
): Promise<CatalogueFamily[]> {
  const parsed = catalogueSearchInput.parse(search);
  const [families, requirements] = await Promise.all([
    findFamilies(familyWhere(parsed)),
    findRequirementList(requirementWhere(parsed)),
  ]);
  return families.map((family) => {
    const requiredIn = requirements
      .filter((row) => row.familyId === family.id)
      .map((row): CatalogueRequirement => ({
        requirementId: row.id,
        scope: row.scope,
        countryId: row.countryId,
        chapterId: row.chapterId,
        ownerName:
          row.scope === "country"
            ? (row.country?.name ?? null)
            : row.scope === "chapter"
              ? (row.chapter?.name ?? null)
              : null,
        relation: requirementRelation(row, active),
      }));
    const own = requiredIn.find((row) => row.relation === "own") ?? null;
    const variants = family.courses.map((course): CatalogueVariant => ({
      courseId: course.id,
      language: course.language,
      title: course.title,
      summary: course.summary,
      published: course.publishedAt !== null,
      lessons: course.lessons.filter((row) => row.kind === "lesson").length,
      quizzes: course.lessons.filter((row) => row.kind === "quiz").length,
      updatedAt: course.updatedAt,
    }));
    return {
      familyId: family.id,
      scope: family.scope,
      countryId: family.countryId,
      chapterId: family.chapterId,
      ownerName: ownerNameOfFamily(family),
      authority: authorityOf(family),
      published: variants.some((variant) => variant.published),
      variants,
      required: own !== null,
      requiredEffective: requiredIn.some((row) => row.relation !== "other"),
      requirementId: own?.requirementId ?? null,
      requiredIn,
    };
  });
}

export async function courseFamilyOf(courseId: string) {
  const course = await requireCourse(courseId);
  return {
    courseId: course.id,
    familyId: course.familyId,
    title: course.title,
    family: course.family,
    authority: authorityOf(course.family),
  };
}

export async function requirementsFor(chapterContexts: ReadinessChapter[]) {
  const result = new Map<string, RequirementView[]>();
  if (chapterContexts.length === 0) return result;
  const rows = await findRequirements(
    requirementWhere({
      countryIds: [
        ...new Set(
          chapterContexts.flatMap((c) => (c.countryId ? [c.countryId] : [])),
        ),
      ],
      chapterIds: [...new Set(chapterContexts.map((c) => c.chapterId))],
    }),
  );
  const views = rows.map(requirementViewOf);
  for (const chapter of chapterContexts)
    result.set(chapter.chapterId, effectiveRequirements(views, chapter));
  return result;
}

export async function exemptionsOf(userIds: string[]) {
  const result = new Map<string, ExemptionRow[]>();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return result;
  for (const row of await findExemptions(unique))
    result.set(row.userId, [...(result.get(row.userId) ?? []), row]);
  return result;
}

export async function grantExemption(
  input: ExemptionGrant,
  context: {
    grantedByUserId: string | null;
    chapterId: string | null;
    visibleTo?: ChapterContext;
  },
) {
  const { userId, familyId, reason } = exemptionGrant.parse(input);
  if (familyId) {
    const family = await findFamilyById(familyId);
    if (!family) throw new DomainError("unknownTrainingCourse");
    if (context.visibleTo && !familyVisibleToChapter(family, context.visibleTo))
      throw new DomainError("familyNotAllowed");
  }
  const familyKey = familyId ?? BLANKET_EXEMPTION;
  try {
    return await transaction(async (tx, emit) => {
      const existing = await findExemption(userId, familyKey, tx);
      if (existing) return { exemption: existing, created: false };
      const exemption = await insertExemption(
        {
          userId,
          familyKey,
          familyId,
          reason,
          grantedByUserId: context.grantedByUserId,
          chapterId: context.chapterId,
        },
        tx,
      );
      await emit({
        type: "training.exemptionGranted",
        userId,
        familyId,
        reason,
        chapterId: context.chapterId,
        actorUserId: context.grantedByUserId,
      });
      return { exemption, created: true };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const exemption = await findExemption(userId, familyKey);
    if (!exemption) throw error;
    return { exemption, created: false };
  }
}

export async function revokeExemption(
  input: { userId: string; familyId: string | null },
  context: { actorUserId: string; chapterId: string | null },
) {
  const familyKey = input.familyId ?? BLANKET_EXEMPTION;
  return transaction(async (tx, emit) => {
    const { count } = await deleteExemption(input.userId, familyKey, tx);
    if (count === 0) return { revoked: false };
    await emit({
      type: "training.exemptionRevoked",
      userId: input.userId,
      familyId: input.familyId,
      chapterId: context.chapterId,
      actorUserId: context.actorUserId,
    });
    return { revoked: true };
  });
}

export type RequiredFamily = {
  familyId: string;
  title: string;
  language: string;
  variants: { courseId: string; language: string; title: string }[];
};

export type PilotFamilyStatus = FamilyStatus<ExemptionRow> & {
  title: string;
};

export type ReadinessGroup = { chapter: ReadinessChapter; userIds: string[] };

export type ReadinessFacts = {
  families: Map<string, RequiredFamily>;
  requirements: Map<string, RequirementView[]>;
  statuses: Map<string, Map<string, PilotFamilyStatus[]>>;
  exemptions: Map<string, ExemptionRow[]>;
};

const uniq = <T>(values: T[]) => [...new Set(values)];

export async function readinessFacts(
  groups: ReadinessGroup[],
  options: { locale?: string | null; extraFamilyIds?: string[] } = {},
): Promise<ReadinessFacts> {
  const chapterContexts = [
    ...new Map(groups.map((g) => [g.chapter.chapterId, g.chapter])).values(),
  ];
  const userIds = uniq(groups.flatMap((group) => group.userIds));
  const preferences = [options.locale, "en"];
  const extra = uniq(options.extraFamilyIds ?? []);

  const requirements = await requirementsFor(chapterContexts);
  const familiesOf = (chapterId: string) =>
    uniq([
      ...(requirements.get(chapterId) ?? []).map((r) => r.familyId),
      ...extra,
    ]);
  const familyIds = uniq(
    chapterContexts.flatMap((c) => familiesOf(c.chapterId)),
  );

  const [courses, exemptions] = await Promise.all([
    familyIds.length ? findPublishedCoursesOfFamilies(familyIds) : [],
    exemptionsOf(userIds),
  ]);

  const variantsByFamily = new Map<string, typeof courses>();
  for (const course of courses)
    variantsByFamily.set(course.familyId, [
      ...(variantsByFamily.get(course.familyId) ?? []),
      course,
    ]);

  const courseIds = uniq(courses.map((course) => course.id));
  const outlines = await outlinesFor(courseIds);
  const lessonIds = uniq([...outlines.values()].flat().map((l) => l.id));

  const [enrollments, completions] = await Promise.all([
    userIds.length && courseIds.length
      ? findEnrollmentsOfUsers(userIds, courseIds)
      : [],
    userIds.length && lessonIds.length
      ? findCompletionsOfUsers(userIds, lessonIds)
      : [],
  ]);
  const enrollmentOf = new Map(
    enrollments.map((row) => [`${row.userId}:${row.courseId}`, row]),
  );
  const completed = new Set(
    completions.map((row) => `${row.userId}:${row.lessonId}`),
  );

  const families = new Map<string, RequiredFamily>();
  for (const [familyId, variants] of variantsByFamily) {
    const shown = pickVariant(variants, preferences)!;
    families.set(familyId, {
      familyId,
      title: shown.title,
      language: shown.language,
      variants: variants.map((variant) => ({
        courseId: variant.id,
        language: variant.language,
        title: variant.title,
      })),
    });
  }

  const statuses = new Map<string, Map<string, PilotFamilyStatus[]>>();
  for (const { chapter, userIds: members } of groups) {
    const byUser = statuses.get(chapter.chapterId) ?? new Map();
    for (const userId of members) {
      const rows = familiesOf(chapter.chapterId).flatMap((familyId) => {
        const variants = variantsByFamily.get(familyId) ?? [];
        const facts: VariantFacts[] = variants.map((variant) => {
          const elements = (outlines.get(variant.id) ?? []).map((element) => ({
            ...element,
            completed: completed.has(`${userId}:${element.id}`),
          }));
          const enrollment = enrollmentOf.get(`${userId}:${variant.id}`);
          return {
            courseId: variant.id,
            language: variant.language,
            totalElements: elements.length,
            completedElements: elements.filter((element) => element.completed)
              .length,
            currentElementTitle: nextOpenElement(elements)?.title ?? null,
            enrollment: enrollment
              ? {
                  startedAt: enrollment.startedAt,
                  lastActivityAt: enrollment.lastActivityAt,
                  passedAt: enrollment.passedAt,
                  attemptCount: enrollment.attemptCount,
                }
              : null,
          };
        });
        const status = familyStatus(
          familyId,
          facts,
          exemptions.get(userId) ?? [],
          preferences,
        );
        return status
          ? [{ ...status, title: families.get(familyId)!.title }]
          : [];
      });
      byUser.set(userId, rows);
    }
    statuses.set(chapter.chapterId, byUser);
  }

  return { families, requirements, statuses, exemptions };
}

export type OwnerMedia = {
  videos: {
    id: string;
    mediaKey: string;
    sourceKey: string;
    uploadId: string | null;
  }[];
  attachments: { id: string; key: string }[];
};

export async function ownerMedia(owners: {
  chapterIds: string[];
  countryIds: string[];
}): Promise<OwnerMedia> {
  if (owners.chapterIds.length + owners.countryIds.length === 0)
    return { videos: [], attachments: [] };
  const [videos, attachments] = await Promise.all([
    findVideosOfOwners(owners.chapterIds, owners.countryIds),
    findAttachmentsOfOwners(owners.chapterIds, owners.countryIds),
  ]);
  return { videos, attachments };
}

export async function purgeOwnerMedia(media: OwnerMedia, actorUserId: string) {
  if (media.attachments.length) {
    await deleteStoredFilesById(media.attachments.map((file) => file.id));
    await Promise.all(
      media.attachments.map((file) => deleteStoredObject(file.key)),
    );
  }
  if (media.videos.length === 0) return;
  await transaction(async (_tx, emit) => {
    for (const video of media.videos)
      await emit({
        type: "trainingVideo.deleted",
        videoId: video.id,
        mediaKey: video.mediaKey,
        sourceKey: video.sourceKey,
        uploadId: video.uploadId,
        chapterId: null,
        actorUserId,
      });
  });
}

export async function familyTitles(
  familyIds: string[],
  locale?: string | null,
): Promise<Map<string, string>> {
  const unique = uniq(familyIds);
  if (unique.length === 0) return new Map();
  const families = await findFamilies({ id: { in: unique } });
  return new Map(
    families.flatMap((family) => {
      const shown = pickVariant(family.courses, [locale, "en"]);
      return shown ? [[family.id, shown.title] as const] : [];
    }),
  );
}
