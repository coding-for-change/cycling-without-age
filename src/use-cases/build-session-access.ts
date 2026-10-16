import { cacheLife, cacheTag } from "next/cache";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import type { Access } from "@/lib/access";
import { accessCacheTags } from "@/lib/cache-tags";

// Everything a guard needs, resolved once per session read so guards never hit
// the DB per request. Embedded into the session by `customSession` in lib/auth.
// Writes from this process expire the entry through its tags; writes from
// another process (seed, scripts) show up within `revalidate`, at most `expire`.
export async function buildSessionAccess(
  userId: string,
  globalRole: string | null,
): Promise<Access> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 60, expire: 300 });
  const [countryAdminOf, memberships] = await Promise.all([
    chapters.listCountriesAdministeredBy(userId),
    membership.listMembershipsOfUser(userId),
  ]);
  const access = { role: globalRole, countryAdminOf, memberships };
  cacheTag(...accessCacheTags(userId, access));
  return access;
}
