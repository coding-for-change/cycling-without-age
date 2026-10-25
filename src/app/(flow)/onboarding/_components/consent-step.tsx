"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { legalHref } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { OnboardingRole } from "@/lib/onboarding";
import type { StepDefaults } from "./step-page";
import { Step, StepError, type StepProgress } from "../../_components/step";
import { submitConsent } from "../actions";

type Strings = {
  title: string;
  safety: string;
  imprint: string;
  privacy: string;
  notice: string;
  health: string;
  required: string;
  error: string;
  joining: string;
};

export function ConsentStep({
  role,
  caretaker,
  progress,
  chapterName,
  setUpBy,
  defaults,
  strings,
  continueLabel,
  locale,
}: {
  role: OnboardingRole;
  caretaker: boolean;
  progress: StepProgress | null;
  chapterName: string | null;
  setUpBy: string | null;
  defaults: StepDefaults;
  strings: Strings;
  continueLabel: string;
  locale: Locale;
}) {
  const router = useRouter();
  const { oops } = useCharacter();
  const boxId = useId();

  const [safetyTicked, setSafetyTicked] = useState(defaults.safety);
  const [health, setHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const asksSafety = role !== "pilot";
  const asksHealth = role === "passenger" && !caretaker;
  const agreements = Number(asksSafety) + Number(asksHealth);

  const complete = !asksSafety || safetyTicked;

  const toggleSafety = (next: boolean) => {
    haptics.selectionChanged();
    setError(null);
    setSafetyTicked(next);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await submitConsent({
        safety: safetyTicked,
        health: asksHealth && health,
      });
      if (!result.ok) {
        haptics.error();
        oops();
        setError(strings.error);
        return;
      }
      haptics.success();
      router.push(result.next, { transitionTypes: ["nav-forward"] });
    });
  };

  return (
    <Step
      title={formatMessage(strings.title, { count: agreements }, locale)}
      description={
        setUpBy ??
        (chapterName
          ? formatMessage(strings.joining, { chapter: chapterName }, locale)
          : undefined)
      }
      progress={progress ?? undefined}
      action={
        <>
          {error ? (
            <StepError>{error}</StepError>
          ) : (
            !complete && (
              <p className="mb-2 text-center text-sm text-ink-soft">
                {strings.required}
              </p>
            )
          )}
          <Button
            disabled={!complete || pending}
            onClick={submit}
            variant="brand"
            size="hero"
          >
            {continueLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {asksSafety ? (
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-(--r-card) border p-4 transition-colors",
              safetyTicked
                ? "border-transparent bg-mint-tint"
                : "border-line bg-canvas hover:bg-canvas-deep",
            )}
          >
            <Checkbox
              checked={safetyTicked}
              onCheckedChange={(next) => toggleSafety(next === true)}
              aria-labelledby={`${boxId}-safety`}
              className="mt-0.5 size-5 rounded-[6px]"
            />
            <span
              id={`${boxId}-safety`}
              className="text-sm leading-relaxed text-ink"
            >
              {strings.safety}
            </span>
          </label>
        ) : null}
        {asksHealth ? (
          <label
            className={cn(
              "mt-5 flex cursor-pointer items-start gap-3 rounded-(--r-card) border border-dashed p-4 transition-colors",
              health
                ? "border-transparent bg-mint-tint"
                : "border-line bg-canvas hover:bg-canvas-deep",
            )}
          >
            <Checkbox
              checked={health}
              onCheckedChange={(next) => {
                haptics.selectionChanged();
                setHealth(next === true);
              }}
              aria-labelledby={`${boxId}-health`}
              className="mt-0.5 size-5 rounded-[6px]"
            />
            <span
              id={`${boxId}-health`}
              className="text-sm leading-relaxed text-ink-soft"
            >
              {strings.health}
            </span>
          </label>
        ) : null}
        <p className="pt-2 text-sm leading-relaxed text-ink-soft">
          <LegalNotice strings={strings} />
        </p>
      </div>
    </Step>
  );
}

function LegalNotice({ strings }: { strings: Strings }) {
  const router = useRouter();
  const parts = strings.notice.split(/(\{imprint\}|\{privacy\})/);
  return (
    <>
      {parts.map((part, index) =>
        part === "{imprint}" || part === "{privacy}" ? (
          <a
            key={index}
            href={legalHref(part === "{imprint}" ? "imprint" : "privacy")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.stopPropagation();
              if (!isNative()) return;
              event.preventDefault();
              router.push(event.currentTarget.pathname);
            }}
            className="underline underline-offset-2 hover:text-ink"
          >
            {part === "{imprint}" ? strings.imprint : strings.privacy}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
