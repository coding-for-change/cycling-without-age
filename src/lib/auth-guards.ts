import { cache } from "react";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { chapters } from "@/features/chapters";
import {
  getHighestRole as highestRole,
  hasAnyAdminScope,
  hasChapterRole,
  isChapterAdmin,
  isCountryAdmin,
  isSuperAdmin,
  resolveAdminScope,
} from "@/lib/access";
import type {
  Access,
  AdminScope,
  ChapterRole,
  HighestRole,
} from "@/lib/access";

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

function deny(): never {
  forbidden();
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!isSuperAdmin(session.access)) deny();
  return session;
}

export async function requireCountryAdmin(countryId: string) {
  const session = await requireAuth();
  if (!isCountryAdmin(session.access, countryId)) deny();
  return session;
}

export async function requireChapterAdmin(chapterId: string) {
  const session = await requireAuth();
  const access = session.access;
  if (hasChapterRole(access, chapterId, "admin")) return session;
  const countryId = await chapters.getChapterCountryId(chapterId);
  if (!isChapterAdmin(access, chapterId, countryId)) deny();
  return session;
}

export async function requireChapterRole(chapterId: string, role: ChapterRole) {
  const session = await requireAuth();
  if (hasChapterRole(session.access, chapterId, role)) return session;
  return requireChapterAdmin(chapterId);
}

/**
 * The gate for the admin dashboard as a whole: anyone who administers *something*
 * gets in, and what they administer comes back with them. The narrower guards
 * above still decide individual chapters and countries — this one only answers
 * "is there any admin surface for this person at all", which is the question
 * `/admin` used to answer with `requireAuth` alone.
 *
 * Cached per request because the shell and the page underneath both call it.
 */
export const requireAdminScope = cache(
  async (): Promise<{ session: Session; scope: AdminScope }> => {
    const session = await requireAuth();
    if (!hasAnyAdminScope(session.access)) deny();

    // ponytail: full country + chapter scan on every admin request, deduped per
    // request by `cache`. Fine at three chapters; at three hundred, resolve only
    // the scope's own rows (`listChapters(countryId)` per administered country
    // plus the directly-administered ids).
    const [countries, allChapters] = await Promise.all([
      chapters.listCountries(),
      chapters.listChapters(),
    ]);

    return {
      session,
      scope: resolveAdminScope(
        session.access,
        countries.map(({ id, code, name }) => ({ id, code, name })),
        allChapters.map(({ id, slug, name, countryId }) => ({
          id,
          slug,
          name,
          countryId,
        })),
      ),
    };
  },
);

export function getHighestRole(session: { access: Access }): HighestRole {
  return highestRole(session.access);
}
