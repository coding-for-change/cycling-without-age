"use client";

import { createContext, useContext } from "react";
import type { InlineFieldLabels } from "@/components/inline-field";
import type { SubjectRef } from "../schemas";
import type { ProfileStrings } from "./profile-view";

export type EditorContext = {
  subject: SubjectRef;
  name: string;
  onBehalf: boolean;
  strings: ProfileStrings;
  labels: InlineFieldLabels;
  language: string;
};

const Ctx = createContext<EditorContext | null>(null);

export const EditorProvider = Ctx.Provider;

export function useEditor() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useEditor outside EditorProvider");
  return value;
}
