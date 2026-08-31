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
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().int().min(1).max(200).optional(),
});
export type ChapterInput = z.infer<typeof chapterInput>;

export const chapterUpdateInput = chapterInput
  .omit({ countryId: true })
  .partial();
export type ChapterUpdateInput = z.infer<typeof chapterUpdateInput>;
