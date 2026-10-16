import { formatDate, type Locale as Notation } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

export const LEGAL_DOCUMENTS = ["privacy", "terms", "imprint"] as const;

export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export const legalHref = (document: LegalDocument) => `/legal/${document}`;

export type LegalLink = { href: string; label: string };

export const legalLinks = (
  titles: Record<LegalDocument, string>,
): LegalLink[] =>
  LEGAL_DOCUMENTS.map((document) => ({
    href: legalHref(document),
    label: titles[document],
  }));

export const editionLine = (
  template: string,
  edition: { version: string; updatedOn: string },
  notation: Notation,
  language: string,
) =>
  formatMessage(
    template,
    { version: edition.version, date: formatDate(edition.updatedOn, notation) },
    language,
  );
