import { formatDuration, type Locale as NotationLocale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

export const TRAINING_LIFE = { stale: 30 } as const;

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

const languageNames = new Map<string, Intl.DisplayNames>();

export function languageName(language: string, locale: string) {
  let names = languageNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "language" });
    languageNames.set(locale, names);
  }
  const name = names.of(language) ?? language;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

export const durationLabel = (
  seconds: number | null,
  notation: NotationLocale,
) => (seconds && seconds > 0 ? formatDuration(seconds, notation) : null);

export function courseMeta(
  lessons: number,
  seconds: number,
  lessonsTemplate: string,
  language: string,
  notation: NotationLocale,
) {
  const count = formatMessage(lessonsTemplate, { count: lessons }, language);
  const duration = durationLabel(seconds, notation);
  return duration ? `${count} · ${duration}` : count;
}

export const elementHref = (courseId: string, elementId: string) =>
  `/pilot/training/${courseId}/${elementId}`;

export const courseHref = (courseId: string) => `/pilot/training/${courseId}`;

export const posterTransitionName = (courseId: string) =>
  `training-poster-${courseId}`;

export function withTrainingMotion<T extends Record<string, string>>(
  classes: T,
): { [K in keyof T]: string } {
  return Object.fromEntries(
    Object.entries(classes).map(([type, name]) => [
      type,
      `${name} training-motion`,
    ]),
  ) as { [K in keyof T]: string };
}
