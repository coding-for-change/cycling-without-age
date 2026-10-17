import { headers } from "next/headers";
import { chapters } from "@/features/chapters";
import { firstDayOfWeek } from "@/lib/calendar";
import {
  formatDate,
  formatWeekday,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import { OperatingHoursCard } from "./operating-hours-card";

const MONDAY = new Date(Date.UTC(2024, 0, 1));
const DAY_MS = 24 * 60 * 60 * 1000;

export async function RidingHoursSettings({
  chapterId,
  dict,
  language,
}: {
  chapterId: string;
  dict: Dictionary;
  language: Locale;
}) {
  const [windows, closures, head] = await Promise.all([
    chapters.listOperatingWindows(chapterId),
    chapters.listClosures(chapterId),
    headers(),
  ]);
  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const startsOn = firstDayOfWeek(notation) || 7;
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const weekday = ((startsOn - 1 + index) % 7) + 1;
    return {
      weekday,
      name: formatWeekday(
        new Date(MONDAY.getTime() + (weekday - 1) * DAY_MS),
        words,
      ),
    };
  });
  const { settings } = dict.admin;

  return (
    <OperatingHoursCard
      chapterId={chapterId}
      windows={windows}
      closures={closures.map((closure) => ({
        ...closure,
        label: formatDate(closure.date, notation),
      }))}
      weekdays={weekdays}
      notation={notation}
      language={language}
      labels={{
        strings: settings.hours,
        status: settings.notifications.status,
        field: settings.notifications.field,
      }}
    />
  );
}
