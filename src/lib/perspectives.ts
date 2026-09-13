import { availablePerspectives, getHighestRole } from "@/lib/access";
import type { Access } from "@/lib/access";
import type { IconKey } from "@/lib/commands";
import type { Dictionary } from "@/lib/i18n";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

export type PerspectiveChoice = {
  perspective: ReturnType<typeof availablePerspectives>[number];
  label: string;
  href: string;
  icon: IconKey;
};

/**
 * The hats a person wears, in one list. The admin scope switcher, the member
 * perspective switcher and the ⌘K palette all render it, so nobody can offer a
 * perspective another surface hides. Perspective-agnostic on purpose: it sits
 * in `lib` rather than under `admin/` because the member shell needs it too.
 */
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
