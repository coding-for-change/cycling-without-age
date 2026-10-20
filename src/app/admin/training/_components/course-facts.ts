import {
  training,
  type ActiveOwner,
  type CatalogueFamily,
  type FamilyOwnerRow,
} from "@/features/training";
import { pickVariant } from "@/features/training/requirements";
import {
  allowsAdmin,
  type Access,
  type ActiveScope,
  type AdminScope,
} from "@/lib/access";
import type { Dictionary } from "@/lib/i18n";

export const scopeSearch = (scope: AdminScope) => ({
  countryIds: [
    ...new Set([
      ...scope.countries.map((country) => country.id),
      ...scope.chapters.map((chapter) => chapter.countryId),
    ]),
  ],
  chapterIds: scope.chapters.map((chapter) => chapter.id),
});

export const familyLabel = (
  courses: { language: string; title: string }[],
  locale: string,
) => pickVariant(courses, [locale, "en"])?.title ?? "";

export const canManageFamily = (access: Access, family: FamilyOwnerRow) =>
  allowsAdmin(access, training.familyAuthority(family));

export const ownerLabelOf = (family: FamilyOwnerRow, dict: Dictionary) => {
  const scopeLabel = dict.admin.training.list.scopes[family.scope];
  const name = training.ownerNameOfFamily(family);
  return name ? `${scopeLabel} · ${name}` : scopeLabel;
};

export const ownerNameOrScope = (family: FamilyOwnerRow, dict: Dictionary) =>
  training.ownerNameOfFamily(family) ??
  dict.admin.training.list.scopes[family.scope];

export const manageableFamilies = (
  families: CatalogueFamily[],
  access: Access,
  locale: string,
) =>
  families
    .filter((family) => allowsAdmin(access, family.authority))
    .map((family) => ({
      id: family.familyId,
      label: familyLabel(family.variants, locale),
      languages: family.variants.map((variant) => variant.language),
    }));

export const courseCreateLabels = (dict: Dictionary) => ({
  ...dict.admin.training.create,
  errors: { ...dict.common.errors, ...dict.admin.training.errors },
});

export function activeOwnerName(
  active: ActiveOwner | null,
  scope: AdminScope,
  activeScope: ActiveScope,
  dict: Dictionary,
) {
  if (!active) return null;
  const { owner } = active;
  if (owner.scope === "global") return dict.admin.training.list.everyone;
  if (owner.scope === "country")
    return activeScope.kind === "country" &&
      activeScope.country.id === owner.countryId
      ? activeScope.country.name
      : (scope.countries.find((country) => country.id === owner.countryId)
          ?.name ?? null);
  return activeScope.kind === "chapter" &&
    activeScope.chapter.id === owner.chapterId
    ? activeScope.chapter.name
    : (scope.chapters.find((chapter) => chapter.id === owner.chapterId)?.name ??
        null);
}

export const familyFitsOwner = (
  family: Pick<CatalogueFamily, "scope" | "countryId" | "chapterId">,
  active: ActiveOwner,
) =>
  training.familyVisibleTo(
    { ...family, chapter: null },
    active.owner.scope === "chapter"
      ? {
          countryIds: active.countryId ? [active.countryId] : [],
          chapterIds: [active.owner.chapterId],
        }
      : active.owner.scope === "country"
        ? { countryIds: [active.owner.countryId], chapterIds: [] }
        : { countryIds: [], chapterIds: [] },
  );
