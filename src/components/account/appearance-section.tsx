"use client";

import { ThemePicker } from "@/components/theme-picker";
import { SettingsGroup, SettingsItem } from "@/components/settings-group";
import type { AccountData } from "./types";

export function AppearanceSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  return (
    <SettingsGroup
      label={label}
      footer={data.strings.appearance.body}
    >
      <SettingsItem>
        <ThemePicker
          variant="row"
          strings={data.theme}
          label={data.strings.appearance.title}
        />
      </SettingsItem>
    </SettingsGroup>
  );
}
