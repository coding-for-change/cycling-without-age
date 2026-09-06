import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import type { Access } from "@/lib/access";

// Everything a guard needs, resolved once per session read so guards never hit
// the DB per request. Embedded into the session by `customSession` in lib/auth.
export async function buildSessionAccess(
  userId: string,
  globalRole: string | null,
): Promise<Access> {
  const [countryAdminOf, memberships] = await Promise.all([
    chapters.listCountriesAdministeredBy(userId),
    membership.listMembershipsOfUser(userId),
  ]);
  return { role: globalRole, countryAdminOf, memberships };
}
