import { Suspense } from "react";
import { chapters } from "@/features/chapters";
import { getHighestRole, requireAuth } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/sign-out-button";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl tracking-tight">Admin dashboard</h1>
      <div className="mt-6 space-y-2 text-ink-soft">
        <Suspense fallback={<Skeleton className="h-16 w-72" />}>
          <Scope />
        </Suspense>
      </div>
      <Suspense fallback={<Skeleton className="mt-6 h-10 w-32" />}>
        <SignOut />
      </Suspense>
    </main>
  );
}

async function Scope() {
  const session = await requireAuth();
  const role = getHighestRole(session);
  const { countryAdminOf, memberships } = session.access;

  const [countries, allChapters] = await Promise.all([
    countryAdminOf.length ? chapters.listCountries() : [],
    memberships.length ? chapters.listChapters() : [],
  ]);

  const nameOf = (id: string) =>
    countries.find((c) => c.id === id)?.name ??
    allChapters.find((c) => c.id === id)?.name ??
    id;

  const scope =
    role === "superadmin"
      ? "Global — every country and chapter"
      : role === "countryAdmin"
        ? `Countries: ${countryAdminOf.map(nameOf).join(", ")}`
        : role === "chapterAdmin"
          ? `Chapters: ${memberships
              .filter((m) => m.roles.includes("admin"))
              .map((m) => nameOf(m.chapterId))
              .join(", ")}`
          : "No admin scope";

  return (
    <>
      <p>
        Highest role: <span className="text-ink">{role ?? "none"}</span>
      </p>
      <p>
        Scope: <span className="text-ink">{scope}</span>
      </p>
    </>
  );
}

async function SignOut() {
  await requireAuth();
  const dict = await getDictionary();
  return (
    <div className="mt-6">
      <SignOutButton label={dict.common.signOut} />
    </div>
  );
}
