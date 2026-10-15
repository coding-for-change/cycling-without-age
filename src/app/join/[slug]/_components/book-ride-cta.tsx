"use client";

import { useRouter } from "next/navigation";
import { Bike } from "lucide-react";
import { saveDraft } from "@/lib/auth-wall";
import { signInHref } from "@/lib/redirects";
import { haptics } from "@/lib/native/haptics";
import { Button } from "@/components/ui/button";

export function BookRideCta({
  slug,
  signedIn,
  strings,
}: {
  slug: string;
  signedIn: boolean;
  strings: { cta: string; body: string };
}) {
  const router = useRouter();

  const book = () => {
    saveDraft("ride", { chapterSlug: slug });
    haptics.tap();
    const target = `/passenger/rides/new?chapter=${encodeURIComponent(slug)}`;
    router.push(signedIn ? target : signInHref(target), {
      transitionTypes: ["nav-forward"],
    });
  };

  return (
    <section className="mt-10 flex flex-col gap-3 rounded-(--r-card) bg-mint-tint p-5">
      <p className="text-sm text-pretty text-ink-soft">{strings.body}</p>
      <Button
        variant="outline"
        onClick={book}
        className="min-h-11 w-fit gap-2 rounded-full border-ink bg-canvas px-8"
      >
        <Bike
          className="size-4"
          aria-hidden
        />
        {strings.cta}
      </Button>
    </section>
  );
}
