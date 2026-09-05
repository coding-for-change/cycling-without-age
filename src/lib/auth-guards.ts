import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { chapters } from "@/features/chapters";
import {
  getHighestRole as highestRole,
  hasChapterRole,
  isChapterAdmin,
  isCountryAdmin,
  isSuperAdmin,
} from "@/lib/access";
import type { Access, ChapterRole, HighestRole } from "@/lib/access";

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

// ponytail: authorization failures redirect home rather than rendering a 403.
// Swap in Next's `forbidden()` once `authInterrupts` + forbidden.tsx land (COD-161).
function deny(): never {
  redirect("/");
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

export function getHighestRole(session: { access: Access }): HighestRole {
  return highestRole(session.access);
}
