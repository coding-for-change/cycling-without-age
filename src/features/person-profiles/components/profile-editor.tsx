"use client";

import { useId } from "react";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { Switch } from "@/components/ui/switch";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { formatMessage } from "@/lib/i18n/format";
import {
  BIO_MAX,
  photoUrl,
  type ProfilePatchInput,
  type SubjectRef,
} from "../schemas";
import type { PersonProfile } from "../facade";
import { updatePersonProfileAction } from "../actions";
import { AccessibilityPicker } from "./accessibility-picker";
import { EditorProvider, useEditor } from "./editor-context";
import { InterestPicker } from "./interest-picker";
import { PhotoField } from "./photo-field";
import { ProfileSection, type ProfileStrings } from "./profile-view";
import { PromptList } from "./prompt-list";

export type EditorPermissions = {
  onBehalf: boolean;
  canUploadPhoto: boolean;
  canRemovePhoto: boolean;
  showAccessibility: boolean;
  canGiveConsent: boolean;
};

export function ProfileEditor({
  subject,
  name,
  avatar,
  age,
  profile,
  permissions,
  strings,
  labels,
  statusLabels,
  language,
}: {
  subject: SubjectRef;
  name: string;
  avatar: string;
  age: number | null;
  profile: PersonProfile;
  permissions: EditorPermissions;
  strings: ProfileStrings;
  labels: InlineFieldLabels;
  statusLabels: { saving: string; saved: string };
  language: string;
}) {
  const save = (patch: ProfilePatchInput) =>
    updatePersonProfileAction({ subject, patch });

  return (
    <SaveStatusProvider>
      <EditorProvider
        value={{
          subject,
          name,
          onBehalf: permissions.onBehalf,
          strings,
          labels,
          language,
        }}
      >
        <div className="grid gap-5">
          <div className="flex min-h-5 justify-end">
            <SaveStatus
              labels={statusLabels}
              words={language}
            />
          </div>

          {permissions.onBehalf ? (
            <p className="rounded-2xl bg-mint-tint p-4 text-sm">
              {formatMessage(strings.onBehalf, { name }, language)}
            </p>
          ) : null}

          <header className="grid justify-items-center gap-3 text-center">
            <PhotoField
              avatar={avatar}
              photo={photoUrl(profile.photoFileId)}
              canUpload={permissions.canUploadPhoto}
              canRemove={permissions.canRemovePhoto}
            />
            <h1 className="text-2xl tracking-tight md:text-3xl">{name}</h1>
            <InlineField
              value={profile.bio}
              multiline
              maxLength={BIO_MAX}
              label={strings.bio.label}
              placeholder={strings.bio.placeholder}
              labels={labels}
              className="w-full justify-self-stretch text-center text-base"
              inputClassName="min-h-24 resize-none rounded-2xl bg-card px-4 py-3 text-center leading-relaxed"
              onSave={(next) => save({ bio: next })}
            />
          </header>

          {age !== null ? (
            <AgeToggle
              age={age}
              hidden={profile.hideAge}
              save={(hideAge) => save({ hideAge })}
            />
          ) : null}

          <ProfileSection
            title={strings.interests.label}
            hint={strings.interests.hint}
          >
            <InterestPicker
              value={{
                picked: profile.interests,
                custom: profile.customInterests,
              }}
            />
          </ProfileSection>

          <ProfileSection
            title={strings.prompts.label}
            hint={strings.prompts.hint}
          >
            <PromptList value={profile.prompts} />
          </ProfileSection>

          {permissions.showAccessibility ? (
            <ProfileSection
              title={strings.accessibility.label}
              hint={strings.accessibility.hint}
            >
              <AccessibilityPicker
                value={{
                  tags: profile.accessibilityTags,
                  none: profile.accessibilityNone,
                }}
                consent={profile.healthConsent}
                canConsent={permissions.canGiveConsent}
              />
            </ProfileSection>
          ) : null}

          <p className="border-t border-line pt-5 text-center text-xs text-ink-soft">
            {strings.visibility}
          </p>
        </div>
      </EditorProvider>
    </SaveStatusProvider>
  );
}

function AgeToggle({
  age,
  hidden,
  save,
}: {
  age: number;
  hidden: boolean;
  save: (hideAge: boolean) => ReturnType<typeof updatePersonProfileAction>;
}) {
  const id = useId();
  const { strings, labels, language } = useEditor();
  const { shown, persist } = useOptimisticSave(
    hidden,
    (next) => save(next),
    labels,
  );

  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 rounded-2xl bg-canvas-deep p-4"
    >
      <span className="grid gap-1">
        <span className="text-sm font-medium">
          {strings.showAge} · {formatMessage(strings.age, { age }, language)}
        </span>
        <span className="text-xs text-ink-soft">{strings.showAgeHint}</span>
      </span>
      <Switch
        id={id}
        checked={!shown}
        onCheckedChange={(checked) => void persist(!checked, shown, false)}
      />
    </label>
  );
}
