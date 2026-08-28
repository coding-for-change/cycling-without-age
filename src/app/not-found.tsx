import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <Suspense
        fallback={
          <>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-9 w-36" />
          </>
        }
      >
        <NotFoundContent />
      </Suspense>
    </main>
  );
}

async function NotFoundContent() {
  const dict = await getDictionary();
  return (
    <>
      <h1 className="text-2xl font-semibold">{dict.notFound.title}</h1>
      <p className="text-muted-foreground">{dict.notFound.description}</p>
      <Button asChild>
        <Link href="/">{dict.notFound.returnHome}</Link>
      </Button>
    </>
  );
}
