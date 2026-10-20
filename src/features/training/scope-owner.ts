import type { ActiveScope, AdminScope } from "@/lib/access";
import type { CatalogueOwner } from "./schemas";

function soleOwner(scope: AdminScope): CatalogueOwner | null {
  if (scope.countries.length === 1)
    return { scope: "country", countryId: scope.countries[0].id };
  if (scope.countries.length === 0 && scope.chapters.length === 1)
    return { scope: "chapter", chapterId: scope.chapters[0].id };
  return null;
}

export function uploadOwnerOf(
  scope: AdminScope,
  active: ActiveScope,
): CatalogueOwner | null {
  if (scope.global) return { scope: "global" };
  if (active.kind === "country")
    return { scope: "country", countryId: active.country.id };
  if (active.kind === "chapter")
    return scope.countries.some(
      (country) => country.id === active.chapter.countryId,
    )
      ? { scope: "country", countryId: active.chapter.countryId }
      : { scope: "chapter", chapterId: active.chapter.id };
  return soleOwner(scope);
}

export function requirementOwnerOf(
  scope: AdminScope,
  active: ActiveScope,
): CatalogueOwner | null {
  if (active.kind === "chapter")
    return { scope: "chapter", chapterId: active.chapter.id };
  if (active.kind === "country")
    return { scope: "country", countryId: active.country.id };
  if (scope.global) return { scope: "global" };
  return soleOwner(scope);
}

export type ActiveOwner = { owner: CatalogueOwner; countryId: string | null };

export function activeOwnerOf(
  scope: AdminScope,
  active: ActiveScope,
): ActiveOwner | null {
  const owner = requirementOwnerOf(scope, active);
  if (!owner) return null;
  if (owner.scope === "country") return { owner, countryId: owner.countryId };
  if (owner.scope === "chapter")
    return {
      owner,
      countryId:
        active.kind === "chapter"
          ? active.chapter.countryId
          : (scope.chapters.find((c) => c.id === owner.chapterId)?.countryId ??
            null),
    };
  return { owner, countryId: null };
}
