"use client";

import type { ReactNode } from "react";
import type { InlineFieldLabels } from "@/components/inline-field";
import { SaveStatusProvider } from "@/components/save-status";
import { EditorProvider } from "@/features/person-profiles/components/editor-context";
import type { ProfileStrings } from "@/features/person-profiles/components/profile-view";
import type { SubjectRef } from "@/features/person-profiles/schemas";

/** One save status and one editor for every stop, as main's editor has. */
export function EditorScope({
  subject,
  name,
  strings,
  labels,
  language,
  children,
}: {
  subject: SubjectRef;
  name: string;
  strings: ProfileStrings;
  labels: InlineFieldLabels;
  language: string;
  children: ReactNode;
}) {
  return (
    <SaveStatusProvider>
      <EditorProvider
        value={{ subject, name, onBehalf: false, strings, labels, language }}
      >
        {children}
      </EditorProvider>
    </SaveStatusProvider>
  );
}
