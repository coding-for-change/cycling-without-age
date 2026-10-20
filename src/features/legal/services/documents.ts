import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Locale } from "@/lib/i18n/locales";
import type { LegalDocument } from "@/lib/legal";

export const readLegalText = (document: LegalDocument, locale: Locale) =>
  readFile(
    join(process.cwd(), "src", "messages", "legal", `${document}.${locale}.md`),
    "utf8",
  );
