"use client";

import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { RichText } from "@/components/markdown";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { CHAPTER_POST_RIDE_MAX } from "@/features/chapters/schemas";
import { updateChapterSettingsAction } from "../actions";

export type PostRideInstructionsLabels = {
  label: string;
  hint: string;
  placeholder: string;
  field: InlineFieldLabels;
  markdown: MarkdownToolLabels;
};

export function PostRideInstructions({
  chapterId,
  value,
  labels,
}: {
  chapterId: string;
  value: string | null;
  labels: PostRideInstructionsLabels;
}) {
  return (
    <div className="grid gap-2">
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
    </div>
  );
}
