import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImprintPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const dict = (await getDictionary()).legal;
  return (
    <article className="space-y-4">
      <h1 className="text-3xl leading-tight tracking-tight">
        {dict.imprint.title}
      </h1>
      <p className="mt-3 text-base text-ink-soft">{dict.imprint.body}</p>
      <p className="rounded-(--r-card) bg-canvas-deep p-4 text-sm text-ink-soft">
        {dict.pending}
      </p>
    </article>
  );
}
