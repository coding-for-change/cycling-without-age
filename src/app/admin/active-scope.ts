import { forbidden } from "next/navigation";
import { resolveActiveScope, scopeChapters } from "@/lib/access";
import { requireAdminScope } from "@/lib/auth-guards";

type AdminSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * The one way an `/admin` page reads its scope. `?chapter=` and `?country=`
 * are user input: a value outside the caller's authority is a 403, never a
 * silent widening back to everything they may see.
 */
export async function readActiveScope(
  searchParams: Promise<AdminSearchParams>,
) {
  const { session, scope } = await requireAdminScope();
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
    chapters,
    chapterIds: chapters.map((c) => c.id),
  };
}
