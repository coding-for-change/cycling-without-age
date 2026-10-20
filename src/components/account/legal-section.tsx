"use client";

import {
  SettingsGroup,
  SettingsItem,
  SettingsRowLink,
} from "@/components/settings-group";
import { LEGAL_DOCUMENTS, legalHref } from "@/lib/legal";
import { isPlainClick } from "@/lib/plain-click";
import { openLegalDocument } from "./account-state";
import type { AccountData } from "./types";

export function LegalSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  return (
    <SettingsGroup label={label}>
      {LEGAL_DOCUMENTS.map((legalDocument) => (
        <SettingsItem key={legalDocument}>
          <SettingsRowLink
            href={legalHref(legalDocument)}
            label={data.legal.documents[legalDocument]}
            chevron
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              openLegalDocument(legalDocument, data.language);
            }}
          />
        </SettingsItem>
      ))}
    </SettingsGroup>
  );
}
