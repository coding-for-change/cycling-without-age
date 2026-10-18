"use client";

import {
  REQUIRED_PILOTS_MAX,
  STAFFING_LEAD_HOURS,
  type ChapterSettings,
  type ChapterSettingsInput,
} from "@/features/chapters/schemas";
import type { InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { SelectRow, ToggleRow } from "@/components/settings-rows";
import { formatMessage } from "@/lib/i18n/format";
import { updateChapterSettingsAction } from "../actions";

export type StaffingSettingsLabels = {
  title: string;
  body: string;
  selfAssign: { label: string; hint: string };
  requiredPilots: { label: string; hint: string; option: string };
  lead: { label: string; hint: string; hours: string; days: string };
  status: { saving: string; saved: string };
  field: InlineFieldLabels;
};

const PILOT_COUNTS = Array.from(
  { length: REQUIRED_PILOTS_MAX },
  (_, i) => i + 1,
);

/** How pilots find rides, and when the chapter hears about one still short. */
export function StaffingSettingsCard({
  chapterId,
  settings,
  language,
  labels,
}: {
  chapterId: string;
  settings: ChapterSettings;
  language: string;
  labels: StaffingSettingsLabels;
}) {
  const save = (input: ChapterSettingsInput) =>
    updateChapterSettingsAction(chapterId, input);
  const leadLabel = (hours: number) =>
    hours % 24 === 0
      ? formatMessage(labels.lead.days, { count: hours / 24 }, language)
      : formatMessage(labels.lead.hours, { count: hours }, language);

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
          <ToggleRow
            value={settings.pilotsMaySelfAssign}
            label={labels.selfAssign.label}
            hint={labels.selfAssign.hint}
            labels={labels.field}
            onSave={(next) => save({ pilotsMaySelfAssign: next })}
          />
          <SelectRow
            value={String(settings.requiredPilotsDefault)}
            label={labels.requiredPilots.label}
            hint={labels.requiredPilots.hint}
            options={PILOT_COUNTS.map((count) => ({
              value: String(count),
              label: formatMessage(
                labels.requiredPilots.option,
                { count },
                language,
              ),
            }))}
            labels={labels.field}
            selectClassName="min-w-48"
            onSave={(next) =>
              save({ requiredPilotsDefault: Number(next ?? 1) })
            }
          />
          <SelectRow
            value={String(settings.staffingCheckLeadHours)}
            label={labels.lead.label}
            hint={labels.lead.hint}
            options={STAFFING_LEAD_HOURS.map((hours) => ({
              value: String(hours),
              label: leadLabel(hours),
            }))}
            labels={labels.field}
            selectClassName="min-w-48"
            onSave={(next) =>
              save({ staffingCheckLeadHours: Number(next ?? 48) })
            }
          />
        </ul>
      </section>
    </SaveStatusProvider>
  );
}
