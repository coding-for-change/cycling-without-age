"use client";

import type { InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { SelectRow } from "@/components/settings-rows";
import type {
  ChapterSettings,
  ChapterSettingsInput,
} from "@/features/chapters/schemas";
import type { Dictionary } from "@/lib/i18n";
import { updateChapterSettingsAction } from "../actions";

type Strings = Dictionary["admin"]["settings"]["booking"];
type Option = { value: string; label: string };

export type BookingChoices = {
  leadTimeHours: Option[];
  horizonDays: Option[];
  rideMinutes: Option[];
  stayMinutes: Option[];
};

export function BookingPolicyCard({
  chapterId,
  settings,
  choices,
  language,
  labels,
}: {
  chapterId: string;
  settings: ChapterSettings;
  choices: BookingChoices;
  language: string;
  labels: {
    strings: Strings;
    status: { saving: string; saved: string };
    field: InlineFieldLabels;
  };
}) {
  const { strings } = labels;
  const save = (input: ChapterSettingsInput) =>
    updateChapterSettingsAction(chapterId, input);
  const row = (
    key: keyof BookingChoices,
    copy: { label: string; hint: string },
    value: number,
    field:
      | "bookingLeadTimeHours"
      | "bookingHorizonDays"
      | "defaultRideMinutes"
      | "defaultStayMinutes",
  ) => (
    <SelectRow
      value={String(value)}
      label={copy.label}
      hint={copy.hint}
      options={choices[key]}
      labels={labels.field}
      onSave={(next) =>
        next === null
          ? Promise.resolve({ ok: false, error: "generic" })
          : save({ [field]: Number(next) })
      }
    />
  );

  return (
    <SaveStatusProvider>
      <section className="grid gap-3 rounded-2xl border border-line p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg">{strings.title}</h2>
          <SaveStatus
            labels={labels.status}
            words={language}
          />
        </div>
        <p className="max-w-prose text-sm text-ink-soft">{strings.body}</p>
        <ul className="grid divide-y divide-line">
          {row(
            "leadTimeHours",
            strings.leadTime,
            settings.bookingLeadTimeHours,
            "bookingLeadTimeHours",
          )}
          {row(
            "horizonDays",
            strings.horizon,
            settings.bookingHorizonDays,
            "bookingHorizonDays",
          )}
          {row(
            "rideMinutes",
            strings.rideMinutes,
            settings.defaultRideMinutes,
            "defaultRideMinutes",
          )}
          {row(
            "stayMinutes",
            strings.stayMinutes,
            settings.defaultStayMinutes,
            "defaultStayMinutes",
          )}
        </ul>
      </section>
    </SaveStatusProvider>
  );
}
