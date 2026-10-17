import { z } from "zod";
import { MEDIA_FAILURE_CODES } from "@/lib/media/failure";

export const TRAINING_VIDEO_STATUSES = [
  "uploading",
  "queued",
  "processing",
  "ready",
  "failed",
] as const;
export type TrainingVideoStatusName = (typeof TRAINING_VIDEO_STATUSES)[number];

export const CONTENT_LANGUAGES = [
  "en",
  "de",
  "da",
  "sv",
  "nb",
  "fi",
  "nl",
  "fr",
  "es",
  "it",
  "pt",
  "pl",
  "cs",
  "is",
  "ja",
] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];
export const contentLanguage = z.enum(CONTENT_LANGUAGES);

export const VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-m4v",
] as const;
export const videoMime = z.enum(VIDEO_MIMES);

export const VIDEO_FAILURE_CODES = MEDIA_FAILURE_CODES;
export type VideoFailureCode = (typeof VIDEO_FAILURE_CODES)[number];

export const MiB = 1024 * 1024;
export const PART_SIZE = 16 * MiB;
export const MAX_PARTS = 10_000;
export const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * MiB;
export const DEFAULT_MAX_DURATION_SECONDS = 60 * 60;

export const partCountOf = (size: number) => Math.ceil(size / PART_SIZE);

export const id = z.string().min(1).max(64);

export const catalogueOwner = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("global") }),
  z.object({ scope: z.literal("country"), countryId: id }),
  z.object({ scope: z.literal("chapter"), chapterId: id }),
]);
export type CatalogueOwner = z.infer<typeof catalogueOwner>;

export const ownerKey = (owner: CatalogueOwner) =>
  owner.scope === "global"
    ? "global"
    : owner.scope === "country"
      ? `country:${owner.countryId}`
      : `chapter:${owner.chapterId}`;

export const parseOwnerKey = (key: string): CatalogueOwner => {
  const [scope, ownerId] = key.split(":");
  if (scope === "country") return { scope: "country", countryId: ownerId };
  if (scope === "chapter") return { scope: "chapter", chapterId: ownerId };
  return { scope: "global" };
};

const title = z.string().trim().min(1).max(160);
const description = z
  .string()
  .trim()
  .max(10_000)
  .transform((value) => value || null)
  .nullable();

export const scopeArg = z
  .string()
  .regex(/^(all|chapter:[^\s:]{1,100}|country:[A-Za-z]{2,3})$/);

export const videoStartInput = z.object({
  scope: scopeArg.optional(),
  language: contentLanguage,
  title,
  mime: videoMime,
  size: z
    .number()
    .int()
    .positive()
    .max(PART_SIZE * MAX_PARTS),
});
export type VideoStartInput = z.input<typeof videoStartInput>;

export const videoCreateInput = videoStartInput
  .omit({ scope: true })
  .extend({ owner: catalogueOwner });
export type VideoCreateInput = z.input<typeof videoCreateInput>;

export const partNumber = z.number().int().min(1).max(MAX_PARTS);

export const videoPartsInput = z.object({
  videoId: id,
  partNumbers: z.array(partNumber).min(1).max(64),
});
export type VideoPartsInput = z.input<typeof videoPartsInput>;

export const videoCompleteInput = z.object({
  videoId: id,
  parts: z
    .array(z.object({ partNumber, etag: z.string().min(1).max(200) }))
    .min(1)
    .max(MAX_PARTS),
});
export type VideoCompleteInput = z.input<typeof videoCompleteInput>;

export const videoUpdateInput = z
  .object({ title, description, language: contentLanguage })
  .partial();
export type VideoUpdateInput = z.input<typeof videoUpdateInput>;

export const posterSecondsInput = z
  .number()
  .min(0)
  .max(24 * 60 * 60);

export const videoIdsInput = z.array(id).max(100);

export const videoSearchInput = z.object({
  countryIds: z.array(id),
  chapterIds: z.array(id),
  includeArchived: z.boolean().default(false),
});
export type VideoSearchInput = z.input<typeof videoSearchInput>;

export const mediaJob = z.object({
  videoId: id,
  revision: z.number().int().min(1),
});
export type MediaJob = z.infer<typeof mediaJob>;

export const posterJob = mediaJob.extend({ seconds: posterSecondsInput });
export type PosterJob = z.infer<typeof posterJob>;

export const purgeJob = z.object({
  videoId: id,
  mediaKey: z.string().min(1).max(32),
  sourceKey: z.string().min(1).max(255),
  uploadId: z.string().max(1024).nullable(),
});
export type PurgeJob = z.infer<typeof purgeJob>;

export const renditionRow = z.object({
  name: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  videoKbps: z.number(),
});
export type RenditionRow = z.infer<typeof renditionRow>;

export const QUESTION_KINDS = ["single", "multiple"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const MAX_OPTIONS = 8;
export const MIN_OPTIONS = 2;
export const MAX_QUESTIONS = 100;
export const MAX_ELEMENTS = 100;

export const ELEMENT_KINDS = ["lesson", "quiz"] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const catalogueSearchInput = z.object({
  countryIds: z.array(id),
  chapterIds: z.array(id),
});
export type CatalogueSearchInput = z.input<typeof catalogueSearchInput>;

export const courseCreateInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("family"),
    owner: catalogueOwner,
    language: contentLanguage,
    title,
  }),
  z.object({
    kind: z.literal("translation"),
    familyId: id,
    language: contentLanguage,
    title,
  }),
]);
export type CourseCreateInput = z.input<typeof courseCreateInput>;

export const courseUpdateInput = z
  .object({
    title,
    summary: optionalText(2_000),
    published: z.boolean(),
  })
  .partial();
export type CourseUpdateInput = z.input<typeof courseUpdateInput>;

export const elementCreateInput = z.object({
  courseId: id,
  kind: z.enum(ELEMENT_KINDS),
  title,
  position: z.number().int().min(0).max(MAX_ELEMENTS).nullable().default(null),
});
export type ElementCreateInput = z.input<typeof elementCreateInput>;

export const elementUpdateInput = z
  .object({
    title,
    body: optionalText(50_000),
    videoId: id.nullable(),
    attachmentFileId: id.nullable(),
    quizShuffle: z.boolean(),
    quizDrawCount: z.number().int().min(1).max(MAX_QUESTIONS).nullable(),
  })
  .partial();
export type ElementUpdateInput = z.input<typeof elementUpdateInput>;

export const idList = (max: number) => z.array(id).min(1).max(max);

export const elementOrderInput = z.object({
  courseId: id,
  elementIds: idList(MAX_ELEMENTS),
});
export type ElementOrderInput = z.input<typeof elementOrderInput>;

export const questionOptionInput = z.object({
  id: id.optional(),
  text: z.string().trim().max(500),
  correct: z.boolean(),
});

export const questionSaveInput = z.object({
  kind: z.enum(QUESTION_KINDS),
  prompt: z.string().trim().max(2_000),
  explanation: optionalText(4_000),
  options: z.array(questionOptionInput).max(MAX_OPTIONS),
});
export type QuestionSaveInput = z.input<typeof questionSaveInput>;

export const questionOrderInput = z.object({
  elementId: id,
  questionIds: idList(MAX_QUESTIONS),
});
export type QuestionOrderInput = z.input<typeof questionOrderInput>;

export const quizAnswersInput = z
  .record(id, z.array(id).max(MAX_OPTIONS))
  .refine((answers) => Object.keys(answers).length <= MAX_QUESTIONS);
export type QuizAnswers = z.infer<typeof quizAnswersInput>;

export const heartbeatInput = z.object({
  lessonId: id,
  position: z
    .number()
    .min(0)
    .max(24 * 60 * 60),
  furthest: z
    .number()
    .min(0)
    .max(24 * 60 * 60),
});
export type HeartbeatInput = z.infer<typeof heartbeatInput>;

export const EXEMPTION_REASONS = [
  "experienced",
  "manual",
  "migration",
] as const;
export type ExemptionReason = (typeof EXEMPTION_REASONS)[number];

export const requirementInput = z.object({
  owner: catalogueOwner,
  familyId: id,
});
export type RequirementInput = z.input<typeof requirementInput>;

export const courseRequiredInput = z.object({
  familyId: id,
  required: z.boolean(),
  scope: scopeArg.optional(),
});
export type CourseRequiredInput = z.input<typeof courseRequiredInput>;

export const exemptionInput = z.object({
  userId: id,
  chapterId: id.optional(),
  familyId: id.nullable(),
});
export type ExemptionInput = z.input<typeof exemptionInput>;

export const exemptionGrant = z.object({
  userId: id,
  familyId: id.nullable(),
  reason: z.enum(EXEMPTION_REASONS),
});
export type ExemptionGrant = z.input<typeof exemptionGrant>;

export const inPersonInput = z.object({
  userId: id,
  chapterId: id.optional(),
});
export type InPersonInput = z.input<typeof inPersonInput>;
