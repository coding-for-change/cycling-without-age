import type { ActiveScope, AdminScope } from "@/lib/access";

export const scopeCountries = (scope: AdminScope, active: ActiveScope) =>
  scope.countries.filter((country) =>
    active.kind === "all"
      ? true
      : active.kind === "country"
        ? country.id === active.country.id
        : country.id === active.chapter.countryId,
  );
