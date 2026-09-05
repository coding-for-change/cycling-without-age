import { Suspense } from "react";
import { UserRound } from "lucide-react";
import { chapters } from "@/features/chapters";
import { getSession, redirectIfElsewhere } from "@/lib/auth-guards";
import { readGuestChapterId } from "@/lib/guest-chapter";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { resolveLocale } from "@/lib/format";
import { AccountDialog } from "@/components/account-dialog";
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
        <SessionActions />
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

async function SessionActions() {
  const session = await getSession();
  if (!session) return null;
  // Guests keep browsing; a signed-in person with a home elsewhere is sent to it.
  redirectIfElsewhere(session, "passenger");
  const [dict, head] = await Promise.all([getDictionary(), headers()]);
  const locale = resolveLocale(head.get("accept-language"));
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <AccountDialog
        strings={dict.account}
        locale={locale}
        trigger={
          <Button
            variant="outline"
            className="min-h-11 gap-2 rounded-full border-line"
          >
            <UserRound
              className="size-4"
              aria-hidden
            />
            {dict.passenger.account}
          </Button>
        }
      />
      <SignOutButton label={dict.common.signOut} />
    </div>
  );
}
