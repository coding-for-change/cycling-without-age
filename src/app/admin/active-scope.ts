import { forbidden } from "next/navigation";
import { resolveActiveScope, scopeChapters } from "@/lib/access";
import type { ActiveScope } from "@/lib/access";
import { requireAdminScope } from "@/lib/auth-guards";
import { canReach, type NavKey } from "./nav";
import { storedActiveScope } from "./scope-cookie";

export type AdminSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const scopeQuery = (active: ActiveScope) =>
  active.kind === "chapter"
    ? `?chapter=${encodeURIComponent(active.chapter.slug)}`
    : active.kind === "country"
      ? `?country=${encodeURIComponent(active.country.code)}`
      : "";

export async function readActiveScope(
  searchParams: Promise<AdminSearchParams>,
  nav?: NavKey,
) {
  const { session, scope } = await requireAdminScope();
  if (nav && !canReach(scope, nav)) forbidden();
  const params = await searchParams;

  const requested = {
    chapter: first(params.chapter),
    country: first(params.country),
  };
  const explicit = Boolean(requested.chapter || requested.country);

  const active = explicit
    ? resolveActiveScope(scope, requested)
    : await storedActiveScope(scope);
  if (!active) forbidden();

  const chapters = scopeChapters(scope, active);
  return {
    session,
    scope,
    active,
    scopeQuery: explicit ? scopeQuery(active) : "",
    chapters,
    chapterIds: chapters.map((c) => c.id),
  };
}
