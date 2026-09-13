"use client";

import { useId, useState, type ReactNode } from "react";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import {
  CHAPTER_WELCOME_NOTE_MAX,
  type ChapterSettings,
  type ChapterSettingsInput,
} from "@/features/chapters/schemas";
import {
  reportSave,
  type ActionResult,
} from "../../_components/action-feedback";
import {
  InlineField,
  type InlineFieldLabels,
} from "../../_components/inline-field";
import {
  SaveStatus,
  SaveStatusProvider,
  useSaveStatus,
} from "../../_components/save-status";
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

function ToggleRow({
  value,
  label,
  hint,
  labels,
  onSave,
}: {
  value: boolean;
  label: string;
  hint: string;
  labels: InlineFieldLabels;
  onSave: (next: boolean) => Promise<ActionResult>;
}) {
  const report = useSaveStatus();
  const id = useId();
  const [override, setOverride] = useState<{
    from: boolean;
    to: boolean;
  } | null>(null);

  // Optimistic until the server refresh catches up, then the prop takes over.
  const shown = override && override.from === value ? override.to : value;

  const persist = async (next: boolean, undoable: boolean) => {
    setOverride({ from: !next, to: next });
    report("saving");
    const ok = reportSave(await onSave(next), {
      report,
      labels,
      undo: undoable ? () => void persist(!next, false) : undefined,
    });
    if (!ok) setOverride(null);
  };

  return (
    <li className="flex min-h-11 items-start justify-between gap-5 py-3">
      <div className="grid gap-1">
        <span
          id={id}
          className="text-sm font-medium"
        >
          {label}
        </span>
        <span className="text-2sm text-ink-soft">{hint}</span>
      </div>
      <Switch
        aria-labelledby={id}
        checked={shown}
        onCheckedChange={(next) => void persist(next, true)}
        className="mt-1"
      />
    </li>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <li className="grid gap-1 py-3">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-2sm text-ink-soft">{hint}</span>
      {children}
    </li>
  );
}
