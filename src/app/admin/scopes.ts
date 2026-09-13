import { defaultActiveScope } from "@/lib/access";
import type { AdminScope } from "@/lib/access";
import type { IconKey, ScopeArg } from "@/lib/commands";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";

export type ScopeChoice = { arg: ScopeArg; label: string; icon: IconKey };

/** The perspective half now lives in `@/lib/perspectives` (the member shell
 * renders it too); re-exported so admin call sites keep one import. */
export { perspectiveChoices, roleLabel } from "@/lib/perspectives";
export type { PerspectiveChoice } from "@/lib/perspectives";

/** Widening is only on offer when there is in fact something wider to see. */
export const canWidenScope = (scope: AdminScope) =>
  scope.global || scope.chapters.length > 1 || scope.countries.length > 1;

/**
 * The single source of the scope list. The sidebar switcher renders it and the
 * command bar turns it into `scope.set` commands, so the two cannot offer
 * different sets of chapters. Widest first: everything, then each country, then
 * the individual chapters.
 */
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

/** What "no narrowing param" resolves to, mirroring `defaultActiveScope`. */
export function defaultScopeArg(scope: AdminScope): ScopeArg {
  const active = defaultActiveScope(scope);

  if (active.kind === "country") return `country:${active.country.code}`;
  if (active.kind === "chapter") return `chapter:${active.chapter.slug}`;
  return "all";
}
