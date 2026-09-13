import { forbidden } from "next/navigation";
import { resolveActiveScope, scopeChapters } from "@/lib/access";
import type { ActiveScope } from "@/lib/access";
import { requireAdminScope } from "@/lib/auth-guards";
import { canReach, type NavKey } from "./nav";

export type AdminSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The scope written back as a query string, so a link out of a scoped page
 * keeps the narrowing. The counterpart of `resolveActiveScope` reading it.
 */
export const scopeQuery = (active: ActiveScope) =>
  active.kind === "chapter"
    ? `?chapter=${encodeURIComponent(active.chapter.slug)}`
    : active.kind === "country"
      ? `?country=${encodeURIComponent(active.country.code)}`
      : "";

/**
 * The one way an `/admin` page reads its scope. `?chapter=` and `?country=`
 * are user input: a value outside the caller's authority is a 403, never a
 * silent widening back to everything they may see.
 *
 * Pass the `NAV` key of the surface being rendered and the row's own `visible`
 * predicate is enforced here, so a page never re-spells the authority its
 * sidebar entry already declares.
 */
export async function readActiveScope(
  searchParams: Promise<AdminSearchParams>,
  nav?: NavKey,
) {
  const { session, scope } = await requireAdminScope();
  if (nav && !canReach(scope, nav)) forbidden();
  const params = await searchParams;

  const active = resolveActiveScope(scope, {
    chapter: first(params.chapter),
    country: first(params.country),
  });
  if (!active) forbidden();

  const chapters = scopeChapters(scope, active);
  return {
    session,
    scope,
    active,
    scopeQuery: scopeQuery(active),
    chapters,
    chapterIds: chapters.map((c) => c.id),
  };
}
