import type { LegalText } from "@/features/legal";
import { readLegalTextAction } from "@/features/legal/actions";
import type { LegalDocument } from "@/lib/legal";

const requests = new Map<string, Promise<LegalText | null>>();

export function requestLegalText(
  legalDocument: LegalDocument,
  language: string,
) {
  const key = `${language}:${legalDocument}`;
  const pending = requests.get(key);
  if (pending) return pending;

  const request = readLegalTextAction(legalDocument).catch(() => null);
  requests.set(key, request);
  void request.then((text) => {
    if (text === null) requests.delete(key);
  });
  return request;
}
