import type { AdminScope } from "@/lib/access";
import type { IconKey, ScopeArg } from "@/lib/commands";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";

export type ScopeChoice = { arg: ScopeArg; label: string; icon: IconKey };

export const canWidenScope = (scope: AdminScope) =>
  scope.global || scope.chapters.length > 1 || scope.countries.length > 1;

export function scopeChoices(
  scope: AdminScope,
  dict: Dictionary,
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
      label: fill(dict.admin.scope.allInCountry, { country: name }),
      icon: "countries" as IconKey,
    })),
    ...scope.chapters.map(({ slug, name }) => ({
      arg: `chapter:${slug}` as ScopeArg,
      label: name,
      icon: "chapters" as IconKey,
    })),
  ];
}
