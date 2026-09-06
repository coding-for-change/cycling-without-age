"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptics } from "@/lib/native/haptics";
import { useCharacter } from "@/components/character";
import { Step, type StepProgress } from "../../_components/step";
import { markPasskeyAnswered } from "../actions";

type Strings = {
  title: string;
  body: string;
  create: string;
  skip: string;
  failed: string;
  nameLabel: string;
  namePlaceholder: string;
};

export function PasskeyStep({
  progress,
  strings,
  requiredNext = null,
}: {
  progress: StepProgress | null;
  strings: Strings;
  /** Set when an admin is sent here by the enrolment gate: no skip, and success
   *  returns to this path instead of the next onboarding step. */
  requiredNext?: string | null;
}) {
  const router = useRouter();
  const character = useCharacter();
  const nameId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The server names the next step; a cached `/onboarding` redirect would replay.
  const leave = (result: { ok: true; next: string } | { ok: false }) =>
    router.push(result.ok ? result.next : "/onboarding", {
      transitionTypes: ["nav-forward"],
    });

  const create = () =>
    startTransition(async () => {
      const result = await authClient.passkey.addPasskey({
        name: name.trim() || undefined,
      });
      if (result?.error) {
        if (
          "code" in result.error &&
          result.error.code === "SESSION_NOT_FRESH"
        ) {
          await authClient.signOut();
          router.replace(
            requiredNext
              ? `/sign-in?next=${encodeURIComponent(requiredNext)}`
              : "/sign-in",
          );
          return;
        }
        haptics.error();
        character.oops();
        character.say("triste");
        setError(strings.failed);
        if (!requiredNext) await markPasskeyAnswered();
        return;
      }
      haptics.success();
      character.say("heureux", 3000);
      const answered = await markPasskeyAnswered();
      // The client router still holds the redirect that sent an admin here, so a
      // soft navigation to `next` would replay it. A full load asks the server again.
      if (requiredNext) window.location.replace(requiredNext);
      else leave(answered);
    });

  const skip = () =>
    startTransition(async () => {
      haptics.tap();
      leave(await markPasskeyAnswered());
    });

  return (
    <Step
      title={strings.title}
      progress={progress ?? undefined}
      action={
        <>
          {error && (
            <p
              role="alert"
              className="mb-2 text-center text-sm text-red"
            >
              {error}
            </p>
          )}
          <div className="mb-4 grid gap-2 text-left">
            <label
              htmlFor={nameId}
              className="text-sm font-medium"
            >
              {strings.nameLabel}
            </label>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={strings.namePlaceholder}
              autoComplete="off"
              maxLength={60}
              className="h-12 rounded-full px-5"
            />
          </div>
          <Button
            size="lg"
            disabled={pending}
            onClick={create}
            className="relative h-16 w-full justify-start rounded-full bg-mint-deep pr-20 pl-7 text-base font-bold text-white shadow-lift hover:bg-mint-deep/90"
          >
            {strings.create}
            <span
              aria-hidden
              className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15"
            >
              <KeyRound className="size-5" />
            </span>
          </Button>
          {!requiredNext && (
            <button
              type="button"
              disabled={pending}
              onClick={skip}
              className="mt-3 w-full rounded-full px-4 py-3 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:opacity-50"
            >
              {strings.skip}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        {/* A single mint-deep disc inside a hairline ring — the shape of the key
            itself, at the size of the promise. */}
        <span className="grid size-40 place-items-center rounded-full ring-1 ring-line">
          <span className="grid size-24 place-items-center rounded-full bg-mint-deep">
            <KeyRound
              className="size-10 text-white"
              aria-hidden
            />
          </span>
        </span>
        <p className="max-w-xs text-center text-base text-ink-soft">
          {strings.body}
        </p>
      </div>
    </Step>
  );
}
