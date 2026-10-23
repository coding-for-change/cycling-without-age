"use client";

import type { InlineFieldLabels } from "@/components/inline-field";
import { SelectRow } from "@/components/settings-rows";
import {
  SCHEDULING_METHODS,
  type ChapterSettings,
  type ChapterSettingsInput,
  type SchedulingMethod,
} from "@/features/chapters/schemas";
import type { Dictionary } from "@/lib/i18n";
import { updateChapterSettingsAction } from "../actions";

type Strings = Dictionary["admin"]["settings"]["booking"];

const isMethod = (value: string | null): value is SchedulingMethod =>
  (SCHEDULING_METHODS as readonly (string | null)[]).includes(value);
type Option = { value: string; label: string };

export type BookingChoices = {
  leadTimeHours: Option[];
  horizonDays: Option[];
  rideMinutes: Option[];
  stayMinutes: Option[];
};

export function BookingPolicy({
  chapterId,
  settings,
  choices,
  labels,
}: {
  chapterId: string;
  settings: ChapterSettings;
  choices: BookingChoices;
  labels: {
    strings: Strings;
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
      <SelectRow
        value={settings.schedulingMethod}
        label={strings.method.label}
        hint={strings.method.hint}
        options={SCHEDULING_METHODS.map((method) => ({
          value: method,
          label: strings.method.options[method],
        }))}
        labels={labels.field}
        onSave={(next) =>
          isMethod(next)
            ? save({ schedulingMethod: next })
            : Promise.resolve({ ok: false, error: "generic" })
        }
      />
    </ul>
  );
}
