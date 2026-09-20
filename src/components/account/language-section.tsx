"use client";

import { LanguagePicker } from "@/components/language-picker";
import type { AccountData } from "./types";

export function LanguageSection({ data }: { data: AccountData }) {
  return (
    <div className="grid justify-items-start gap-3">
      <p className="max-w-prose text-sm text-ink-soft">
        {data.strings.language.body}
      </p>
      <LanguagePicker
        locale={data.language}
        label={data.strings.language.title}
      />
    </div>
  );
}
