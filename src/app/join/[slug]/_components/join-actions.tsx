"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyToChaptersAsPilot,
  joinChapterAsPassenger,
  type MembershipActionResult,
} from "@/features/membership/actions";
import { haptics } from "@/lib/native/haptics";
import { Button } from "@/components/ui/button";

type Card = { title: string; body: string; cta: string };

export function JoinActions({
  chapterId,
  pendingApplication,
  strings,
  errors,
}: {
  chapterId: string;
  pendingApplication: boolean;
  strings: { passenger: Card; pilot: Card & { pending: string } };
  errors: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (act: () => Promise<MembershipActionResult>) =>
    startTransition(async () => {
      setError(null);
      const result = await act();
      if (!result.ok) {
        haptics.error();
        setError(errors[result.error] ?? errors.generic);
        return;
      }
      haptics.success();
      // ponytail: /onboarding is the dispatcher — it resolves the next step and
      // redirects, and both actions above revalidate it. Calling
      // `nextOnboardingPath()` here would push straight there, but that import
      // crosses two `src/app` elements and boundaries/dependencies refuses it.
      router.push("/onboarding", { transitionTypes: ["nav-forward"] });
    });

  return (
    <div className="mt-8 grid gap-4">
      <div className="rounded-(--r-card) border border-line p-5">
        <h2 className="font-display text-lg font-bold">
          {strings.passenger.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{strings.passenger.body}</p>
        <Button
          disabled={pending}
          onClick={() => run(() => joinChapterAsPassenger(chapterId))}
          className="mt-4 min-h-11 rounded-full bg-red px-8 text-white hover:bg-red-hover disabled:bg-grey-tint disabled:text-ink-faint"
        >
          {strings.passenger.cta}
        </Button>
      </div>

      <div className="rounded-(--r-card) border border-line p-5">
        <h2 className="font-display text-lg font-bold">
          {strings.pilot.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{strings.pilot.body}</p>
        <Button
          variant="outline"
          disabled={pending || pendingApplication}
          onClick={() => run(() => applyToChaptersAsPilot([chapterId]))}
          className="mt-4 min-h-11 rounded-full border-ink px-8"
        >
          {strings.pilot.cta}
        </Button>
        {pendingApplication ? (
          <p className="mt-2 text-sm text-ink-soft">{strings.pilot.pending}</p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm text-red"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
