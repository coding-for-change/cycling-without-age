import { Suspense } from "react";
import { notFound } from "next/navigation";
import { chapters } from "@/features/chapters";
import { requireAuth } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { RideConfirmation } from "../_components/ride-confirmation";

type Params = { params: Promise<{ slug: string }> };

export default function RidePage({ params }: Params) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <Suspense fallback={<RideSkeleton />}>
        <Ride params={params} />
      </Suspense>
    </main>
  );
}

function RideSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-16 w-full rounded-(--r-card)" />
    </div>
  );
}

async function Ride({ params }: Params) {
  const { slug } = await params;
  await requireAuth();

  const [chapter, dict] = await Promise.all([
    chapters.getChapterBySlug(slug),
    getDictionary(),
  ]);

  if (!chapter) notFound();

  return (
    <RideConfirmation
      slug={slug}
      chapterName={chapter.name}
      strings={dict.join.ride}
    />
  );
}
