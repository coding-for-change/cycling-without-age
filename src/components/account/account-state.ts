"use client";

import { useSyncExternalStore } from "react";
import type { LegalText } from "@/features/legal";
import type { LegalDocument } from "@/lib/legal";
import { requestLegalText } from "./legal-text-request";
import type { AccountSectionKey } from "./sections";

export type OpenLegalDocument = {
  name: LegalDocument;
  text: Promise<LegalText | null>;
};

export type AccountView = {
  section: AccountSectionKey;
  legalDocument: OpenLegalDocument | null;
};

let current: AccountView | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const show = (view: AccountView | null) => {
  current = view;
  listeners.forEach((listener) => listener());
};

export const openAccount = (section: AccountSectionKey = "profile") =>
  show({ section, legalDocument: null });

export const openLegalDocument = (name: LegalDocument, language: string) =>
  show({
    section: "legal",
    legalDocument: { name, text: requestLegalText(name, language) },
  });

export const closeLegalDocument = () =>
  show({ section: "legal", legalDocument: null });

export const closeAccount = () => show(null);

export const useAccountView = () =>
  useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
