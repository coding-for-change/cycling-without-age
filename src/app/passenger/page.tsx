import { Suspense } from "react";
import { chapters } from "@/features/chapters";
import { getSession } from "@/lib/auth-guards";
import { readGuestChapterId } from "@/lib/guest-chapter";
import { getDictionary } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/components/sign-out-button";

export default function PassengerHomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-3xl tracking-tight">Passenger home</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-5 w-64" />}>
        <ChosenChapter />
      </Suspense>
      <Suspense fallback={null}>
        <SignOut />
      </Suspense>
    </main>
  );
}

async function ChosenChapter() {
  const id = await readGuestChapterId();
  const chapter = id ? await chapters.getChapter(id) : null;
  return (
    <p className="mt-6 text-ink-soft">
      {chapter ? `Browsing ${chapter.name}` : "No chapter chosen yet"}
    </p>
  );
}

async function SignOut() {
  const session = await getSession();
  if (!session) return null;
  const dict = await getDictionary();
  return (
    <div className="mt-6">
      <SignOutButton label={dict.common.signOut} />
    </div>
  );
}
