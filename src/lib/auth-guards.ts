import { cache } from "react";
import { cookies, headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import {
  availablePerspectives,
  getHighestRole as highestRole,
  hasAnyAdminScope,
  hasChapterRole,
  isChapterAdmin,
  isCountryAdmin,
  isSuperAdmin,
  resolveAdminScope,
} from "@/lib/access";
import { HOME_BY_ROLE, NEXT_COOKIE, safeNextPath } from "@/lib/redirects";
import type {
  Access,
  AdminScope,
  ChapterRole,
  HighestRole,
  Perspective,
} from "@/lib/access";

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/** The destination parked by `proxy.ts`, spent by `resolveDestination`. */
export const readNextPath = async () =>
  safeNextPath((await cookies()).get(NEXT_COOKIE)?.value);

/** `x-pathname` is stamped by `proxy.ts`; Next 16 has no other way to ask. */
const currentPath = async () =>
  safeNextPath((await headers()).get("x-pathname"));

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const from = await currentPath();
    redirect(from ? `/sign-in?next=${encodeURIComponent(from)}` : "/sign-in");
  }
  return session;
}

function deny(): never {
  forbidden();
}

/**
 * Admins sign in with a passkey — the enrollment gate for every admin surface,
 * checked in the guards rather than only in the shell so a passkey-less admin
 * cannot POST straight at a Server Action either.
 *
 * Known ceiling (see ARCHITECTURE.md): this proves possession of a passkey, not
 * that this session used one. The upgrade path is session step-up.
 */
const ensureAdminPasskey = cache(async (userId: string) => {
  const account = await profile.getProfile(userId);
  if ((account?._count.passkeys ?? 0) > 0) return;

  const from = (await currentPath()) ?? "/admin";
  redirect(`/onboarding/passkey?required=1&next=${encodeURIComponent(from)}`);
});

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!isSuperAdmin(session.access)) deny();
  await ensureAdminPasskey(session.user.id);
  return session;
}

export async function requireCountryAdmin(countryId: string) {
  const session = await requireAuth();
  if (!isCountryAdmin(session.access, countryId)) deny();
  await ensureAdminPasskey(session.user.id);
  return session;
}

export async function requireChapterAdmin(chapterId: string) {
  const session = await requireAuth();
  const access = session.access;
  if (!hasChapterRole(access, chapterId, "admin")) {
    const countryId = await chapters.getChapterCountryId(chapterId);
    if (!isChapterAdmin(access, chapterId, countryId)) deny();
  }
  await ensureAdminPasskey(session.user.id);
  return session;
}

export async function requireCountryAdminOfChapter(chapterId: string) {
  const session = await requireAuth();
  const countryId = await chapters.getChapterCountryId(chapterId);
  if (!countryId || !isCountryAdmin(session.access, countryId)) deny();
  await ensureAdminPasskey(session.user.id);
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
    // Not a 403: a pilot who lands on /admin is lost, not intruding. The narrow
    // guards behind the actions still answer with `forbidden()`.
    if (!hasAnyAdminScope(session.access)) redirect(homeOf(session));
    await ensureAdminPasskey(session.user.id);

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

/** Where this account belongs when nothing more specific was asked for. */
export function homeOf(session: { access: Access }): string {
  const role = getHighestRole(session);
  return role ? HOME_BY_ROLE[role] : "/onboarding";
}

/**
 * Sends someone away from a perspective that is not theirs — but only if they
 * have one of their own. Someone with no role at all (a pilot whose application
 * is still pending) falls through to the screen that explains why.
 */
export function redirectIfElsewhere(
  session: { access: Access },
  perspective: Perspective,
): void {
  const available = availablePerspectives(session.access);
  if (available.includes(perspective) || available.length === 0) return;
  redirect(homeOf(session));
}

export async function requirePerspective(perspective: Perspective) {
  const session = await requireAuth();
  redirectIfElsewhere(session, perspective);
  return session;
}
