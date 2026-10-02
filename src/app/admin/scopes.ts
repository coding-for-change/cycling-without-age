import type { AdminScope } from "@/lib/access";
import type { IconKey, ScopeArg } from "@/lib/commands";
import type { Dictionary, Locale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

export type ScopeChoice = { arg: ScopeArg; label: string; icon: IconKey };

export const canWidenScope = (scope: AdminScope) =>
  scope.global || scope.chapters.length > 1 || scope.countries.length > 1;

export function scopeChoices(
  scope: AdminScope,
  dict: Dictionary,
  locale: Locale,
): ScopeChoice[] {
  return [
    ...(canWidenScope(scope)
      ? [
          {
            arg: "all" as ScopeArg,
            label: dict.admin.scope.all,
            icon: "chapters" as IconKey,
          },
        ]
      : []),
    ...scope.countries.map(({ code, name }) => ({
      arg: `country:${code}` as ScopeArg,
      label: formatMessage(
        dict.admin.scope.allInCountry,
        { country: name },
        locale,
      ),
      icon: "countries" as IconKey,
    })),
    ...scope.chapters.map(({ slug, name }) => ({
      arg: `chapter:${slug}` as ScopeArg,
      label: name,
      icon: "chapters" as IconKey,
    })),
  ];
}
