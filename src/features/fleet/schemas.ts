import { z } from "zod";
import { FILE_KINDS } from "@/lib/storage/limits";

export const TRISHAW_STATUSES = ["active", "maintenance", "retired"] as const;
export const CATALOGUE_SCOPES = ["global", "country", "chapter"] as const;

export type TrishawStatusName = (typeof TRISHAW_STATUSES)[number];
export type CatalogueScopeName = (typeof CATALOGUE_SCOPES)[number];

export const id = z.string().min(1).max(64);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const fileKind = z.enum(FILE_KINDS);

export const uploadRequestInput = z.object({
  kind: fileKind,
  mime: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export const uploadCommitInput = z.object({
  kind: fileKind,
  key: z.string().min(1).max(255),
});

export const typeOwner = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("global") }),
  z.object({ scope: z.literal("country"), countryId: id }),
  z.object({ scope: z.literal("chapter"), chapterId: id }),
]);
export type TypeOwner = z.infer<typeof typeOwner>;

export const ownerKey = (owner: TypeOwner) =>
  owner.scope === "global"
    ? "global"
    : owner.scope === "country"
      ? `country:${owner.countryId}`
      : `chapter:${owner.chapterId}`;

export const parseOwnerKey = (key: string): TypeOwner => {
  const [scope, ownerId] = key.split(":");
  if (scope === "country") return { scope: "country", countryId: ownerId };
  if (scope === "chapter") return { scope: "chapter", chapterId: ownerId };
  return { scope: "global" };
};

const uniqueIds = (max: number) =>
  z
    .array(id)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length);

export const photoIds = uniqueIds(12);

const typeFields = {
  name: z.string().trim().min(1).max(80),
  description: optionalText(10_000).optional(),
  seats: z.number().int().min(1).max(6),
  wheelchairAccessible: z.boolean(),
  photoFileIds: photoIds.optional(),
  manualFileId: id.nullable().optional(),
};

export const typeCreateInput = z.object({
  owner: typeOwner,
  ...typeFields,
});
export type TypeCreateInput = z.input<typeof typeCreateInput>;

export const typeUpdateInput = z
  .object(typeFields)
  .omit({ photoFileIds: true })
  .partial();
export type TypeUpdateInput = z.input<typeof typeUpdateInput>;

export const typeSearchInput = z.object({
  countryIds: z.array(id),
  chapterIds: z.array(id),
  search: z.string().trim().max(80).optional(),
  includeArchived: z.boolean().default(false),
});
export type TypeSearchInput = z.input<typeof typeSearchInput>;

export const trishawCreateInput = z.object({
  name: z.string().trim().min(1).max(80),
  typeId: id.nullable(),
  storageLocationId: id,
  frameNumber: optionalText(64).optional(),
  photoFileIds: photoIds.optional(),
  note: optionalText(2_000).optional(),
});
export type TrishawCreateInput = z.input<typeof trishawCreateInput>;

export const trishawUpdateInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    typeId: id.nullable(),
    frameNumber: optionalText(64),
    note: optionalText(2_000),
  })
  .partial();
export type TrishawUpdateInput = z.input<typeof trishawUpdateInput>;

export const trishawStatusInput = z.enum(TRISHAW_STATUSES);

const locationFields = {
  name: z.string().trim().min(1).max(120),
  address: optionalText(240).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  entrance: optionalText(500).optional(),
  entrancePhotoFileId: id.nullable().optional(),
  accessCode: optionalText(64).optional(),
  accessNotes: optionalText(5_000).optional(),
  returnInstructions: optionalText(5_000).optional(),
};

export const chapterLocationInput = z.object({
  chapterId: id,
  ...locationFields,
});
export type ChapterLocationInput = z.input<typeof chapterLocationInput>;

export const poolInput = z.object({
  countryId: id,
  membersMayManage: z.boolean().default(false),
  ...locationFields,
});
export type PoolInput = z.input<typeof poolInput>;

export const locationUpdateInput = z
  .object({ ...locationFields, membersMayManage: z.boolean() })
  .partial();
export type LocationUpdateInput = z.input<typeof locationUpdateInput>;

export const POOL_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const poolCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{2}$/);

export const poolDecisionInput = z.object({
  membershipId: id,
  approve: z.boolean(),
  note: optionalText(500).optional(),
});
export type PoolDecisionInput = z.input<typeof poolDecisionInput>;

export const damageReportInput = z.object({
  trishawId: id,
  rideId: id.nullable().optional(),
  description: z.string().trim().min(3).max(2_000),
  photoFileId: id.nullable().optional(),
  grounding: z.boolean(),
});
export type DamageReportInput = z.input<typeof damageReportInput>;

export const damageClearInput = z.object({
  damageIds: uniqueIds(20).min(1),
  note: z.string().trim().min(2).max(500),
});
export type DamageClearInput = z.input<typeof damageClearInput>;

export const trishawNoteInput = z.object({
  trishawId: id,
  text: z.string().trim().min(1).max(2_000),
});
export type TrishawNoteInput = z.input<typeof trishawNoteInput>;
