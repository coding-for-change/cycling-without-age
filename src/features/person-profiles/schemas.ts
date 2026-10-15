import { z } from "zod";

const id = z.string().min(1).max(64);

export const subjectRef = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("user"), id }),
  z.object({ kind: z.literal("passenger"), id }),
]);
export type SubjectRef = z.infer<typeof subjectRef>;

const REF_PREFIX = { user: "u", passenger: "p" } as const;

export const subjectSlug = (subject: SubjectRef) =>
  `${REF_PREFIX[subject.kind]}-${subject.id}`;

export function parseSubjectSlug(slug: string): SubjectRef | null {
  const match = /^([up])-([a-zA-Z0-9_-]{1,64})$/.exec(slug);
  if (!match) return null;
  return { kind: match[1] === "u" ? "user" : "passenger", id: match[2] };
}

export const INTEREST_KEYS = [
  "nature",
  "gardening",
  "birds",
  "animals",
  "music",
  "singing",
  "dancing",
  "reading",
  "history",
  "art",
  "crafts",
  "photography",
  "cooking",
  "baking",
  "travel",
  "sports",
  "football",
  "cycling",
  "theatre",
  "films",
  "games",
  "family",
  "faith",
  "technology",
] as const;
export type InterestKey = (typeof INTEREST_KEYS)[number];

export const PROMPT_KEYS = [
  "grewUp",
  "favouritePlace",
  "askMeAbout",
  "firstJob",
  "favouriteSong",
  "dreamRide",
] as const;
export type PromptKey = (typeof PROMPT_KEYS)[number];

export const ACCESSIBILITY_GROUPS = {
  mobility: ["wheelchair", "walkingAid", "helpBoarding"],
  senses: ["hearing", "vision"],
  comfort: ["getsCold", "bumpSensitive", "shortRides"],
  communication: ["speech", "memory", "companion"],
} as const;
export type AccessibilityGroup = keyof typeof ACCESSIBILITY_GROUPS;

export const ACCESSIBILITY_TAGS = Object.values(ACCESSIBILITY_GROUPS).flat();
export type AccessibilityTag =
  (typeof ACCESSIBILITY_GROUPS)[AccessibilityGroup][number];

export const PILOT_STEPS = ["trainingVideos", "workshop"] as const;
export type PilotStep = (typeof PILOT_STEPS)[number];

export const BIO_MAX = 160;
export const INTERESTS_MAX = 8;
export const CUSTOM_INTERESTS_MAX = 3;
export const CUSTOM_INTEREST_MAX_LENGTH = 24;
export const PROMPTS_MAX = 3;
export const PROMPT_ANSWER_MAX = 140;

const distinct = <T>(values: T[]) => new Set(values).size === values.length;

export const interestsInput = z
  .array(z.enum(INTEREST_KEYS))
  .max(INTERESTS_MAX)
  .refine(distinct);

export const customInterestsInput = z
  .array(z.string().trim().min(1).max(CUSTOM_INTEREST_MAX_LENGTH))
  .max(CUSTOM_INTERESTS_MAX)
  .refine((values) => distinct(values.map((v) => v.toLowerCase())));

export const promptAnswer = z.object({
  key: z.enum(PROMPT_KEYS),
  answer: z.string().trim().min(1).max(PROMPT_ANSWER_MAX),
});
export type PromptAnswer = z.infer<typeof promptAnswer>;

export const promptsInput = z
  .array(promptAnswer)
  .max(PROMPTS_MAX)
  .refine((prompts) => distinct(prompts.map((p) => p.key)));

export const accessibilityTagsInput = z
  .array(
    z.enum(ACCESSIBILITY_TAGS as [AccessibilityTag, ...AccessibilityTag[]]),
  )
  .refine(distinct);

const nonEmpty = (patch: Record<string, unknown>) =>
  Object.values(patch).some((value) => value !== undefined);

export const profilePatch = z
  .object({
    bio: z
      .string()
      .trim()
      .max(BIO_MAX)
      .transform((value) => value || null)
      .nullable()
      .optional(),
    interests: interestsInput.optional(),
    customInterests: customInterestsInput.optional(),
    prompts: promptsInput.optional(),
    hideAge: z.boolean().optional(),
  })
  .refine(nonEmpty);
export type ProfilePatch = z.infer<typeof profilePatch>;
export type ProfilePatchInput = z.input<typeof profilePatch>;

export const accessibilityInput = z.discriminatedUnion("none", [
  z.object({ none: z.literal(true) }),
  z.object({ none: z.literal(false), tags: accessibilityTagsInput }),
]);
export type AccessibilityInput = z.infer<typeof accessibilityInput>;

export const photoMime = z.string().min(1).max(100);

export const photoUploadRequest = z.object({
  subject: subjectRef,
  mime: photoMime,
  size: z.number().int().positive(),
});

export const photoUploadCommit = z.object({
  subject: subjectRef,
  key: z.string().min(1).max(255),
  riderAgrees: z.boolean().optional(),
});

export const healthConsentInput = z.object({
  subject: subjectRef,
  attest: z.literal(true),
});

export const pilotStepInput = z.object({
  step: z.enum(PILOT_STEPS),
  done: z.boolean(),
});

export const photoUrl = (fileId: string | null) =>
  fileId ? `/api/files/${fileId}` : null;
