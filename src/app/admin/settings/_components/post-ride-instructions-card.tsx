"use client";

import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { RichText } from "@/components/markdown";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { SaveStatus, SaveStatusProvider } from "@/components/save-status";
import { CHAPTER_POST_RIDE_MAX } from "@/features/chapters/schemas";
import { updateChapterSettingsAction } from "../actions";

export type PostRideInstructionsLabels = {
  title: string;
  body: string;
  label: string;
  hint: string;
  placeholder: string;
  status: { saving: string; saved: string };
  field: InlineFieldLabels;
  markdown: MarkdownToolLabels;
};

export function PostRideInstructionsCard({
  chapterId,
  value,
  language,
  labels,
}: {
  chapterId: string;
  value: string | null;
  language: string;
  labels: PostRideInstructionsLabels;
}) {
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
        <InlineField
          multiline
          maxLength={CHAPTER_POST_RIDE_MAX}
          value={value}
          label={labels.label}
          placeholder={labels.placeholder}
          markdown={labels.markdown}
          display={(text) => <RichText text={text} />}
          onSave={(next) =>
            updateChapterSettingsAction(chapterId, {
              postRideInstructions: next,
            })
          }
          labels={labels.field}
        />
        <p className="text-2sm text-ink-soft">{labels.hint}</p>
      </section>
    </SaveStatusProvider>
  );
}
