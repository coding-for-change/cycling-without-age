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

const MINUTES_PER_DAY = 24 * 60;

export const BOOKING_LIMITS = {
  leadTimeHours: { min: 0, max: 24 * 30 },
  horizonDays: { min: 1, max: 365 },
  rideMinutes: { min: 15, max: 12 * 60 },
  stayMinutes: { min: 0, max: 12 * 60 },
} as const;

export const BOOKING_CHOICES = {
  leadTimeHours: [0, 12, 24, 48, 72, 168],
  horizonDays: [14, 30, 60, 90, 180, 365],
  rideMinutes: [30, 45, 60, 90, 120, 180],
  stayMinutes: [15, 30, 45, 60, 90, 120, 180, 240],
} as const;
export const CHAPTER_POST_RIDE_MAX = 5_000;

export type ChapterSettings = {
  notifyOnMemberJoined: boolean;
  applicationAlertPush: boolean;
  replyToEmail: string | null;
  welcomeNote: string | null;
  postRideInstructions: string | null;
  damageAlertPush: boolean;
  bookingLeadTimeHours: number;
  bookingHorizonDays: number;
  defaultRideMinutes: number;
  defaultStayMinutes: number;
};

export const DEFAULT_CHAPTER_SETTINGS: ChapterSettings = {
  notifyOnMemberJoined: true,
  applicationAlertPush: true,
  replyToEmail: null,
  welcomeNote: null,
  postRideInstructions: null,
  damageAlertPush: true,
  bookingLeadTimeHours: 48,
  bookingHorizonDays: 60,
  defaultRideMinutes: 60,
  defaultStayMinutes: 60,
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
    bookingLeadTimeHours: z
      .number()
      .int()
      .min(BOOKING_LIMITS.leadTimeHours.min)
      .max(BOOKING_LIMITS.leadTimeHours.max),
    bookingHorizonDays: z
      .number()
      .int()
      .min(BOOKING_LIMITS.horizonDays.min)
      .max(BOOKING_LIMITS.horizonDays.max),
    defaultRideMinutes: z
      .number()
      .int()
      .min(BOOKING_LIMITS.rideMinutes.min)
      .max(BOOKING_LIMITS.rideMinutes.max),
    defaultStayMinutes: z
      .number()
      .int()
      .min(BOOKING_LIMITS.stayMinutes.min)
      .max(BOOKING_LIMITS.stayMinutes.max),
  })
  .partial();
export type ChapterSettingsInput = z.infer<typeof chapterSettingsInput>;

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const OPERATING_HOURS = {
  stepMinutes: 15,
  minWindowMinutes: 30,
  maxWindowsPerDay: 4,
  closureReasonMax: 200,
  closuresShown: 50,
} as const;

const dayMinute = z
  .number()
  .int()
  .min(0)
  .max(MINUTES_PER_DAY)
  .refine((minute) => minute % OPERATING_HOURS.stepMinutes === 0, "step");

export const operatingWindowInput = z
  .object({
    weekday: z
      .number()
      .int()
      .min(1)
      .max(7)
      .transform((day) => day as Weekday),
    startMinute: dayMinute,
    endMinute: dayMinute,
  })
  .superRefine((window, ctx) => {
    if (window.endMinute <= window.startMinute)
      ctx.addIssue({
        code: "custom",
        message: "endsAfterStart",
        path: ["endMinute"],
      });
    else if (
      window.endMinute - window.startMinute <
      OPERATING_HOURS.minWindowMinutes
    )
      ctx.addIssue({
        code: "custom",
        message: "windowTooShort",
        path: ["endMinute"],
      });
  });
export type OperatingWindowInput = z.input<typeof operatingWindowInput>;
export type OperatingWindow = z.output<typeof operatingWindowInput>;

export const operatingHoursInput = z
  .array(operatingWindowInput)
  .max(WEEKDAYS.length * OPERATING_HOURS.maxWindowsPerDay)
  .superRefine((windows, ctx) => {
    for (const weekday of WEEKDAYS) {
      const day = windows
        .filter((window) => window.weekday === weekday)
        .toSorted((a, b) => a.startMinute - b.startMinute);
      if (day.length > OPERATING_HOURS.maxWindowsPerDay)
        ctx.addIssue({ code: "custom", message: "tooManyWindows" });
      for (let index = 1; index < day.length; index++)
        if (day[index].startMinute < day[index - 1].endMinute)
          ctx.addIssue({ code: "custom", message: "windowsOverlap" });
    }
  });
export type OperatingHoursInput = z.input<typeof operatingHoursInput>;

export const closureInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => {
      const [year, month, day] = date.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
    }),
  reason: z
    .string()
    .trim()
    .max(OPERATING_HOURS.closureReasonMax)
    .transform((value) => value || null)
    .nullable()
    .optional(),
});
export type ClosureInput = z.input<typeof closureInput>;
