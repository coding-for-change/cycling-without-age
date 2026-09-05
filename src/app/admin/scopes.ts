import {
  availablePerspectives,
  defaultActiveScope,
  getHighestRole,
} from "@/lib/access";
import type { Access, AdminScope } from "@/lib/access";
import type { IconKey, ScopeArg } from "@/lib/commands";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";

export type ScopeChoice = { arg: ScopeArg; label: string; icon: IconKey };

export type PerspectiveChoice = {
  perspective: ReturnType<typeof availablePerspectives>[number];
  label: string;
  href: string;
  icon: IconKey;
};

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

export function perspectiveChoices(
  access: Access,
  dict: Dictionary,
): PerspectiveChoice[] {
  return availablePerspectives(access).map((perspective) => ({
    perspective,
    label: dict.admin.perspectives[perspective],
    href: PERSPECTIVE_HOME[perspective],
    icon: perspective as IconKey,
  }));
}

export function roleLabel(access: Access, dict: Dictionary): string {
  const role = getHighestRole(access);
  return role ? dict.admin.roles[role] : dict.admin.perspectives.admin;
}
