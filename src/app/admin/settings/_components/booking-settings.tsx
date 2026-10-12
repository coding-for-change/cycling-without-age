import { BOOKING_CHOICES, chapters } from "@/features/chapters";
import { formatDuration, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { BookingPolicyCard } from "./booking-policy-card";

const HOURS_PER_DAY = 24;

const withCurrent = (values: readonly number[], current: number) =>
  values.includes(current)
    ? [...values]
    : [...values, current].toSorted((a, b) => a - b);

export async function BookingSettings({ chapterId }: { chapterId: string }) {
  const [settings, dict, language] = await Promise.all([
    chapters.getSettings(chapterId),
    getDictionary(),
    getLocale(),
  ]);
  const words = wordsLocale(language);
  const strings = dict.admin.settings.booking;
  const count = (template: string, value: number) =>
    formatMessage(template, { count: value }, words);
  const duration = (minutes: number) => formatDuration(minutes * 60, words);
  const notice = (hours: number) =>
    hours === 0
      ? strings.noNotice
      : hours % HOURS_PER_DAY === 0
        ? count(strings.days, hours / HOURS_PER_DAY)
        : count(strings.hours, hours);
  const options = (
    values: readonly number[],
    current: number,
    label: (value: number) => string,
  ) =>
    withCurrent(values, current).map((value) => ({
      value: String(value),
      label: label(value),
    }));

  return (
    <BookingPolicyCard
      chapterId={chapterId}
      settings={settings}
      choices={{
        leadTimeHours: options(
          BOOKING_CHOICES.leadTimeHours,
          settings.bookingLeadTimeHours,
          notice,
        ),
        horizonDays: options(
          BOOKING_CHOICES.horizonDays,
          settings.bookingHorizonDays,
          (days) => count(strings.days, days),
        ),
        rideMinutes: options(
          BOOKING_CHOICES.rideMinutes,
          settings.defaultRideMinutes,
          duration,
        ),
        stayMinutes: options(
          BOOKING_CHOICES.stayMinutes,
          settings.defaultStayMinutes,
          duration,
        ),
      }}
      language={language}
      labels={{
        strings,
        status: dict.admin.settings.notifications.status,
        field: dict.admin.settings.notifications.field,
      }}
    />
  );
}
