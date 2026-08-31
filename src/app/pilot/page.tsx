import { Suspense } from "react";
import { requireAuth } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/sign-out-button";


export default function PilotHomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl tracking-tight">Pilot home</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-10 w-32" />}>
        <Gate />
      </Suspense>
    </main>
  );
}

async function Gate() {
  await requireAuth();
  const dict = await getDictionary();
  return (
    <div className="mt-6">
      <SignOutButton label={dict.common.signOut} />
    </div>
  );
}
