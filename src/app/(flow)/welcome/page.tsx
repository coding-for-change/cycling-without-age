import { Suspense } from "react";
import { chapters } from "@/features/chapters";
import { getDictionary, getLocale } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeCarousel } from "./_components/welcome-carousel";

async function getChapterCoords(): Promise<[number, number][]> {
  "use cache";
  return (await chapters.listChapters()).map((chapter) => [
    chapter.latitude,
    chapter.longitude,
  ]);
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<WelcomeSkeleton />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const [dict, locale, chapterCoords] = await Promise.all([
    getDictionary(),
    getLocale(),
    getChapterCoords(),
  ]);
  return (
    <WelcomeCarousel
      strings={{ ...dict.welcome, language: dict.common.language }}
      locale={locale}
      chapterCoords={chapterCoords}
    />
  );
}

function WelcomeSkeleton() {
  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-2 lg:grid-rows-1">
      <div className="flex min-h-0 flex-col justify-end gap-4 px-6 pb-6 lg:order-2 lg:bg-canvas-deep lg:px-10 lg:pb-10">
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex flex-col justify-center gap-2 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:order-1 lg:p-10">
        <div className="w-full lg:max-w-sm">
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
