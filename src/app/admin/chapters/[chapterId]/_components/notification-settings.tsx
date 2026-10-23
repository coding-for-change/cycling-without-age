"use client";

import {
  CHAPTER_WELCOME_NOTE_MAX,
  type ChapterSettings,
  type ChapterSettingsInput,
} from "@/features/chapters/schemas";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { FieldRow, ToggleRow } from "@/components/settings-rows";
import { isEmail } from "@/lib/email";
import { updateChapterSettingsAction } from "../actions";

export type NotificationSettingsLabels = {
  memberJoined: { label: string; hint: string };
  applicationPush: { label: string; hint: string };
  damagePush: { label: string; hint: string };
  requestPush: { label: string; hint: string };
  replyTo: {
    label: string;
    hint: string;
    placeholder: string;
    invalid: string;
  };
  welcomeNote: { label: string; hint: string; placeholder: string };
  field: InlineFieldLabels;
};

export function NotificationSettings({
  chapterId,
  settings,
  labels,
}: {
  chapterId: string;
  settings: ChapterSettings;
  labels: NotificationSettingsLabels;
}) {
  const save = (input: ChapterSettingsInput) =>
    updateChapterSettingsAction(chapterId, input);

  return (
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
      <ToggleRow
        value={settings.requestAlertPush}
        label={labels.requestPush.label}
        hint={labels.requestPush.hint}
        labels={labels.field}
        onSave={(next) => save({ requestAlertPush: next })}
      />
      <ToggleRow
        value={settings.damageAlertPush}
        label={labels.damagePush.label}
        hint={labels.damagePush.hint}
        labels={labels.field}
        onSave={(next) => save({ damageAlertPush: next })}
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
  );
}
