"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike } from "lucide-react";
import { saveDraft, signInHref } from "@/lib/auth-wall";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RideWhen } from "./ride-draft";

const WHENS: RideWhen[] = ["morning", "afternoon", "any"];

export function BookRideCta({
  slug,
  signedIn,
  strings,
}: {
  slug: string;
  signedIn: boolean;
  strings: {
    cta: string;
    whenTitle: string;
    when: Record<RideWhen, string>;
    confirm: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<RideWhen | null>(null);

  const confirm = () => {
    if (!when) return;
    saveDraft("ride", { chapterSlug: slug, when });
    haptics.tap();
    const target = `/join/${slug}/ride`;
    router.push(signedIn ? target : signInHref(target), {
      transitionTypes: ["nav-forward"],
    });
  };

  return (
    <section className="mt-10 rounded-(--r-card) bg-mint-tint p-5">
      {open ? (
        <>
          <h2
            id="ride-when"
            className="font-display text-lg font-bold"
          >
            {strings.whenTitle}
          </h2>
          <div
            role="group"
            aria-labelledby="ride-when"
            className="mt-3 flex flex-wrap gap-2"
          >
            {WHENS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={when === option}
                onClick={() => setWhen(option)}
                className={cn(
                  "min-h-11 rounded-full border px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                  when === option
                    ? "border-mint-deep bg-mint-deep text-white"
                    : "border-line bg-canvas hover:bg-canvas-deep",
                )}
              >
                {strings.when[option]}
              </button>
            ))}
          </div>
          <Button
            disabled={!when}
            onClick={confirm}
            className="mt-4 min-h-11 rounded-full bg-mint-deep px-8 text-white hover:bg-mint-deep/90 disabled:bg-grey-tint disabled:text-ink-faint"
          >
            {strings.confirm}
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="min-h-11 gap-2 rounded-full border-ink bg-canvas px-8"
        >
          <Bike
            className="size-4"
            aria-hidden
          />
          {strings.cta}
        </Button>
      )}
    </section>
  );
}
