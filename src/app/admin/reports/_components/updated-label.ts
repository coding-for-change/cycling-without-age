import { formatRelativeTime, wordsLocale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

export const updatedLabel = (
  template: string,
  generatedAt: string,
  language: string,
  now: Date,
) =>
  formatMessage(
    template,
    {
      time: formatRelativeTime(
        generatedAt,
        wordsLocale(language),
        now,
        "short",
      ),
    },
    language,
  );
