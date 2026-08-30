import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<Skeleton className="h-10 w-60" />}>
        <Title />
      </Suspense>
    </main>
  );
}

async function Title() {
  const dict = await getDictionary();
  return <h1 className="text-4xl font-bold">{dict.home.title}</h1>;
}
