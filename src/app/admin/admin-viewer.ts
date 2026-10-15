import { cacheLife } from "next/cache";
import { requireAdminScope } from "@/lib/auth-guards";
import type { AdminViewer } from "./_components/viewer-scope";
import { scopeArgOf, storedActiveScope } from "./scope-cookie";

export const ADMIN_LIFE = { stale: 5 * 60 } as const;

export async function adminViewer(): Promise<AdminViewer> {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const { scope } = await requireAdminScope();
  const stored = await storedActiveScope(scope);

  return {
    chapters: scope.chapters.map(({ id, slug, countryId }) => ({
      id,
      slug,
      countryId,
    })),
    countries: scope.countries.map(({ id, code }) => ({ id, code })),
    stored: scopeArgOf(stored),
  };
}
