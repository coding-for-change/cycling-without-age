import { z } from "zod";

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

/** "Aarhus Nord – Plejehjem" → "aarhus-nord-plejehjem". Same grammar `chapterInput.slug` accepts. */
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

// A logo is fetched by every visitor's browser, so only web schemes may reach the column.
const httpUrl = z.url({ protocol: /^https?$/ }).max(500);

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
  description: z.string().trim().max(600).optional(),
  logo: httpUrl.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(200).optional(),
});
export type ChapterInput = z.infer<typeof chapterInput>;

// Optional text clears to `null`, so an inline edit can empty a field that
// `chapterInput` would otherwise read as "unchanged".
export const chapterUpdateInput = chapterInput
  .omit({ countryId: true, slug: true })
  .extend({
    address: z.string().trim().max(240).nullable(),
    careHomeName: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(600).nullable(),
    logo: httpUrl.nullable(),
  })
  .partial();
export type ChapterUpdateInput = z.infer<typeof chapterUpdateInput>;
