import { z } from "zod";
import { isValidTimeZone } from "@/lib/time-zone";

/**
 * An IANA zone the runtime can actually format in. Optional on create — the
 * facade resolves it from the chapter's country — and correctable afterwards.
 */
const timeZone = z
  .string()
  .trim()
  .max(64)
  .refine(isValidTimeZone, "unknown IANA time zone");

export const countryInput = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "ISO 3166-1 alpha-2")
    .transform((c) => c.toUpperCase()),
});
export type CountryInput = z.infer<typeof countryInput>;

export const countryUpdateInput = countryInput.partial();
export type CountryUpdateInput = z.infer<typeof countryUpdateInput>;

const FOLD: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  ø: "o",
  å: "a",
  œ: "oe",
};

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[ßæøåœ]/g, (c) => FOLD[c])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

const httpUrl = z.url({ protocol: /^https?$/ }).max(500);

export const isHttpUrl = (value: string | null | undefined) =>
  value != null && httpUrl.safeParse(value).success;

export const CHAPTER_RADIUS_KM = {
  min: 1,
  max: 200,
  sliderMax: 60,
  default: 10,
} as const;

export const CHAPTER_DESCRIPTION_MAX = 600;

export const chapterInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-kebab-case"),
  countryId: z.string().min(1),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().max(240).optional(),
  careHomeName: z.string().trim().max(160).optional(),
  description: z.string().trim().max(CHAPTER_DESCRIPTION_MAX).optional(),
  logo: httpUrl.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z
    .number()
    .int()
    .min(CHAPTER_RADIUS_KM.min)
    .max(CHAPTER_RADIUS_KM.max)
    .optional(),
  timeZone: timeZone.optional(),
});
export type ChapterInput = z.infer<typeof chapterInput>;

export const chapterUpdateInput = chapterInput
  .omit({ countryId: true, slug: true })
  .extend({
    address: z.string().trim().max(240).nullable(),
    careHomeName: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(CHAPTER_DESCRIPTION_MAX).nullable(),
    logo: httpUrl.nullable(),
  })
  .partial();
export type ChapterUpdateInput = z.infer<typeof chapterUpdateInput>;

export const CHAPTER_WELCOME_NOTE_MAX = 600;
export const CHAPTER_POST_RIDE_MAX = 5_000;

export type ChapterSettings = {
  notifyOnMemberJoined: boolean;
  applicationAlertPush: boolean;
  replyToEmail: string | null;
  welcomeNote: string | null;
  postRideInstructions: string | null;
  damageAlertPush: boolean;
};

export const DEFAULT_CHAPTER_SETTINGS: ChapterSettings = {
  notifyOnMemberJoined: true,
  applicationAlertPush: true,
  replyToEmail: null,
  welcomeNote: null,
  postRideInstructions: null,
  damageAlertPush: true,
};

export const chapterSettingsInput = z
  .object({
    notifyOnMemberJoined: z.boolean(),
    applicationAlertPush: z.boolean(),
    replyToEmail: z
      .string()
      .trim()
      .pipe(
        z
          .email()
          .max(254)
          .transform((value) => value.toLowerCase()),
      )
      .nullable(),
    welcomeNote: z
      .string()
      .trim()
      .min(1)
      .max(CHAPTER_WELCOME_NOTE_MAX)
      .nullable(),
    postRideInstructions: z
      .string()
      .trim()
      .min(1)
      .max(CHAPTER_POST_RIDE_MAX)
      .nullable(),
    damageAlertPush: z.boolean(),
  })
  .partial();
export type ChapterSettingsInput = z.infer<typeof chapterSettingsInput>;
