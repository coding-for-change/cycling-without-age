"use client";

import {
  DEMAND_CHECK_LEAD_HOURS,
  REMINDER_LEAD_MINUTES,
  type ChapterSettings,
  type ChapterSettingsInput,
} from "@/features/chapters/schemas";
import type { InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { SelectRow } from "@/components/settings-rows";
import { formatMessage } from "@/lib/i18n/format";
import { updateChapterSettingsAction } from "../actions";

export type ReminderSettingsLabels = {
  title: string;
  body: string;
  rider: { label: string; hint: string };
  volunteer: { label: string; hint: string };
  demand: { label: string; hint: string };
  minutes: string;
  hours: string;
  days: string;
  status: { saving: string; saved: string };
  field: InlineFieldLabels;
};

/** Lifecycle 4C and 5B: when the chapter's riders and pilots hear about a ride. */
export function ReminderSettingsCard({
  chapterId,
  settings,
  language,
  labels,
}: {
  chapterId: string;
  settings: ChapterSettings;
  language: string;
  labels: ReminderSettingsLabels;
}) {
  const save = (input: ChapterSettingsInput) =>
    updateChapterSettingsAction(chapterId, input);
  const before = (minutes: number) =>
    minutes % 1440 === 0
      ? formatMessage(labels.days, { count: minutes / 1440 }, language)
      : minutes % 60 === 0
        ? formatMessage(labels.hours, { count: minutes / 60 }, language)
        : formatMessage(labels.minutes, { count: minutes }, language);
  const reminderOptions = REMINDER_LEAD_MINUTES.map((minutes) => ({
    value: String(minutes),
    label: before(minutes),
  }));

  return (
    <SaveStatusProvider>
      <section className="grid gap-3 rounded-2xl border border-line p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg">{labels.title}</h2>
          <SaveStatus
            labels={labels.status}
            words={language}
          />
        </div>
        <p className="max-w-prose text-sm text-ink-soft">{labels.body}</p>

        <ul className="grid divide-y divide-line">
          <SelectRow
            value={String(settings.riderReminderLeadMinutes)}
            label={labels.rider.label}
            hint={labels.rider.hint}
            options={reminderOptions}
            labels={labels.field}
            selectClassName="min-w-48"
            onSave={(next) =>
              save({ riderReminderLeadMinutes: Number(next ?? 1440) })
            }
          />
          <SelectRow
            value={String(settings.volunteerReminderLeadMinutes)}
            label={labels.volunteer.label}
            hint={labels.volunteer.hint}
            options={reminderOptions}
            labels={labels.field}
            selectClassName="min-w-48"
            onSave={(next) =>
              save({ volunteerReminderLeadMinutes: Number(next ?? 1440) })
            }
          />
          <SelectRow
            value={String(settings.demandCheckLeadHours)}
            label={labels.demand.label}
            hint={labels.demand.hint}
            options={DEMAND_CHECK_LEAD_HOURS.map((hours) => ({
              value: String(hours),
              label: before(hours * 60),
            }))}
            labels={labels.field}
            selectClassName="min-w-48"
            onSave={(next) =>
              save({ demandCheckLeadHours: Number(next ?? 24) })
            }
          />
        </ul>
      </section>
    </SaveStatusProvider>
  );
}
