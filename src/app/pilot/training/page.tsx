import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { membership } from "@/features/membership";
import { requireAuth } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export default function PilotTrainingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Suspense fallback={<TrainingSkeleton />}>
        <Training />
      </Suspense>
    </main>
  );
}

function TrainingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

async function Training() {
  const session = await requireAuth();
  const [dict, memberships, applications] = await Promise.all([
    getDictionary(),
    membership.listMembershipsOfUser(session.user.id),
    membership.listApplicationsOfUser(session.user.id),
  ]);

  const allowed =
    memberships.some((m) => m.roles.includes("pilot")) ||
    applications.some((a) => a.status === "pending");
  if (!allowed) redirect(applications.length > 0 ? "/pilot" : "/onboarding");

  const strings = dict.pilot.training;

  return (
    <>
      <h1 className="text-3xl tracking-tight">{strings.title}</h1>
      <Empty className="mt-8 border border-line">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="bg-mint-tint text-ink"
          >
            <GraduationCap aria-hidden />
          </EmptyMedia>
          <EmptyDescription className="text-ink-soft">
            {strings.body}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            asChild
            variant="outline"
            className="min-h-11 gap-2 rounded-full border-line"
          >
            <Link href="/pilot">
              <ArrowLeft
                className="size-4"
                aria-hidden
              />
              {strings.back}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </>
  );
}
