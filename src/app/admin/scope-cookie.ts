import { cookies } from "next/headers";
import { defaultActiveScope, resolveActiveScope } from "@/lib/access";
import type { ActiveScope, AdminScope } from "@/lib/access";
import type { ScopeArg } from "@/lib/commands";

export const ADMIN_SCOPE_COOKIE = "cwa.admin-scope";
export const ADMIN_SCOPE_MAX_AGE = 60 * 60 * 24 * 365;

export const scopeArgParams = (
  arg: string | undefined,
): { chapter?: string; country?: string } => {
  const [kind, value] = arg?.split(":") ?? [];
  if (!value) return {};
  if (kind === "chapter") return { chapter: value };
  if (kind === "country") return { country: value };
  return {};
};

export const scopeArgOf = (active: ActiveScope): ScopeArg =>
  active.kind === "chapter"
    ? `chapter:${active.chapter.slug}`
    : active.kind === "country"
      ? `country:${active.country.code}`
      : "all";

export async function storedActiveScope(scope: AdminScope) {
  const stored = (await cookies()).get(ADMIN_SCOPE_COOKIE)?.value;
  return (
    resolveActiveScope(scope, scopeArgParams(stored)) ??
    defaultActiveScope(scope)
  );
}
