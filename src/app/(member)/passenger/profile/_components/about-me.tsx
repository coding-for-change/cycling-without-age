"use client";

import type { ReactNode } from "react";
import { InlineField } from "@/components/inline-field";
import { updatePersonProfileAction } from "@/features/person-profiles/actions";
import { AccessibilityPicker } from "@/features/person-profiles/components/accessibility-picker";
import { useEditor } from "@/features/person-profiles/components/editor-context";
import { InterestPicker } from "@/features/person-profiles/components/interest-picker";
import { PromptList } from "@/features/person-profiles/components/prompt-list";
import {
  BIO_MAX,
  type ProfilePatchInput,
} from "@/features/person-profiles/schemas";
import type { PersonProfile } from "@/features/person-profiles";
import { Dictation, type DictationStrings } from "./dictation";

function Part({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h3 className="text-base font-medium">{title}</h3>
        {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * Main's profile — the few words, interests, prompts and what helps on a
 * ride — laid into one stop, with the words also told instead of typed.
 */
export function AboutMe({
  profile,
  showAccessibility,
  canGiveConsent,
  dictation,
  lang,
}: {
  profile: PersonProfile;
  showAccessibility: boolean;
  canGiveConsent: boolean;
  dictation: DictationStrings;
  /** BCP 47 tag the dictation listens for. */
  lang: string;
}) {
  const { subject, strings, labels } = useEditor();
  const save = (patch: ProfilePatchInput) =>
    updatePersonProfileAction({ subject, patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <InlineField
          value={profile.bio}
          multiline
          maxLength={BIO_MAX}
          label={strings.bio.label}
          placeholder={strings.bio.placeholder}
          labels={labels}
          className="w-full text-base"
          inputClassName="min-h-24 resize-none rounded-2xl bg-card px-4 py-3 leading-relaxed"
          onSave={(next) => save({ bio: next })}
        />
        <Dictation
          lang={lang}
          strings={dictation}
          onAdd={(heard) =>
            save({
              bio: [profile.bio, heard]
                .filter(Boolean)
                .join(" ")
                .slice(0, BIO_MAX),
            })
          }
        />
      </div>

      <Part
        title={strings.interests.label}
        hint={strings.interests.hint}
      >
        <InterestPicker
          value={{
            picked: profile.interests,
            custom: profile.customInterests,
          }}
        />
      </Part>

      <Part
        title={strings.prompts.label}
        hint={strings.prompts.hint}
      >
        <PromptList value={profile.prompts} />
      </Part>

      {showAccessibility ? (
        <Part
          title={strings.accessibility.label}
          hint={strings.accessibility.hint}
        >
          <AccessibilityPicker
            value={{
              tags: profile.accessibilityTags,
              none: profile.accessibilityNone,
            }}
            consent={profile.healthConsent}
            canConsent={canGiveConsent}
          />
        </Part>
      ) : null}
    </div>
  );
}
