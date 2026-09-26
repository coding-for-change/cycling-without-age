"use client";

import { LanguagePicker } from "@/components/language-picker";
import { SettingsGroup, SettingsItem } from "@/components/settings-group";
import type { AccountData } from "./types";

export function LanguageSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  return (
    <SettingsGroup
      label={label}
      footer={data.strings.language.body}
    >
      <SettingsItem>
        <LanguagePicker
          variant="row"
          locale={data.language}
          label={data.strings.language.title}
        />
      </SettingsItem>
    </SettingsGroup>
  );
}
