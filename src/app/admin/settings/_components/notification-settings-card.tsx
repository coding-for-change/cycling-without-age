"use client";

import { z } from "zod";
import {
  CHAPTER_WELCOME_NOTE_MAX,
  type ChapterSettings,
  type ChapterSettingsInput,
} from "@/features/chapters/schemas";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { FieldRow, ToggleRow } from "@/components/settings-rows";
import { updateChapterSettingsAction } from "../actions";

export type NotificationSettingsLabels = {
  title: string;
  body: string;
  memberJoined: { label: string; hint: string };
  applicationPush: { label: string; hint: string };
  replyTo: {
    label: string;
    hint: string;
    placeholder: string;
    invalid: string;
  };
  welcomeNote: { label: string; hint: string; placeholder: string };
  status: { saving: string; saved: string };
  field: InlineFieldLabels;
};

const isEmail = (next: string) => z.email().safeParse(next).success;

export function NotificationSettingsCard({
  chapterId,
  settings,
  language,
  labels,
}: {
  chapterId: string;
  settings: ChapterSettings;
  language: string;
  labels: NotificationSettingsLabels;
}) {
  const save = (input: ChapterSettingsInput) =>
    updateChapterSettingsAction(chapterId, input);

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
            value={settings.notifyOnMemberJoined}
            label={labels.memberJoined.label}
            hint={labels.memberJoined.hint}
            labels={labels.field}
            onSave={(next) => save({ notifyOnMemberJoined: next })}
          />
          <ToggleRow
            value={settings.applicationAlertPush}
            label={labels.applicationPush.label}
            hint={labels.applicationPush.hint}
            labels={labels.field}
            onSave={(next) => save({ applicationAlertPush: next })}
          />
          <FieldRow
            label={labels.replyTo.label}
            hint={labels.replyTo.hint}
          >
            <InlineField
              type="email"
              inputMode="email"
              maxLength={254}
              value={settings.replyToEmail}
              label={labels.replyTo.label}
              placeholder={labels.replyTo.placeholder}
              validate={isEmail}
              onSave={(next) => save({ replyToEmail: next })}
              labels={{ ...labels.field, invalid: labels.replyTo.invalid }}
            />
          </FieldRow>
          <FieldRow
            label={labels.welcomeNote.label}
            hint={labels.welcomeNote.hint}
          >
            <InlineField
              multiline
              maxLength={CHAPTER_WELCOME_NOTE_MAX}
              value={settings.welcomeNote}
              label={labels.welcomeNote.label}
              placeholder={labels.welcomeNote.placeholder}
              onSave={(next) => save({ welcomeNote: next })}
              labels={labels.field}
            />
          </FieldRow>
        </ul>
      </section>
    </SaveStatusProvider>
  );
}
