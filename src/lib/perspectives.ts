import { availablePerspectives, getHighestRole } from "@/lib/access";
import type { Access, Perspective } from "@/lib/access";
import type { IconKey } from "@/lib/commands";
import type { Dictionary } from "@/lib/i18n";
import { PERSPECTIVE_HOME } from "@/lib/redirects";

export type PerspectiveChoice = {
  perspective: ReturnType<typeof availablePerspectives>[number];
  label: string;
  href: string;
  icon: IconKey;
};

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

export const nextPerspective = (
  available: readonly Perspective[],
  current: Perspective,
): Perspective | null => {
  if (available.length < 2) return null;
  const index = available.indexOf(current);
  return index === -1 ? null : available[(index + 1) % available.length];
};
