"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth-guards";
import { getLocale } from "@/lib/i18n";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { getLegalText, type LegalText } from "./facade";

const legalDocument = z.enum(LEGAL_DOCUMENTS);

export async function readLegalTextAction(
  document: z.input<typeof legalDocument>,
): Promise<LegalText | null> {
  await requireAuth();
  const parsed = legalDocument.safeParse(document);
  if (!parsed.success) return null;

  return getLegalText(parsed.data, await getLocale());
}
