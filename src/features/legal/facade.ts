import type { Locale } from "@/lib/i18n/locales";
import type { LegalDocument } from "@/lib/legal";
import { readLegalText } from "./services/documents";

export type LegalEdition = {
  version: string;
  updatedOn: string;
  draft: boolean;
};

const LEGAL_EDITIONS: Record<LegalDocument, LegalEdition> = {
  privacy: { version: "0.1", updatedOn: "2026-10-15", draft: true },
  terms: { version: "0.1", updatedOn: "2026-10-15", draft: true },
  imprint: { version: "0.1", updatedOn: "2026-10-15", draft: true },
};

export type LegalText = LegalEdition & {
  document: LegalDocument;
  text: string;
};

export const editionOf = (document: LegalDocument): LegalEdition =>
  LEGAL_EDITIONS[document];

export async function getLegalText(
  document: LegalDocument,
  locale: Locale,
): Promise<LegalText> {
  return {
    document,
    ...editionOf(document),
    text: await readLegalText(document, locale),
  };
}
