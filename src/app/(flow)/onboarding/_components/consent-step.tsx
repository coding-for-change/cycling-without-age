"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import type { OnboardingRole } from "@/lib/onboarding";
import type { StepDefaults } from "./step-page";
import { Agreement, LegalLinked } from "./agreement";
import { Step, StepError, type StepProgress } from "../../_components/step";
import { submitConsent } from "../actions";

type Strings = {
  title: string;
  terms: string;
  safety: string;
  imprint: string;
  privacy: string;
  termsOfUse: string;
  notice: string;
  health: string;
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

  const [termsTicked, setTermsTicked] = useState(defaults.terms);
  const [safetyTicked, setSafetyTicked] = useState(defaults.safety);
  const [health, setHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const asksSafety = role !== "pilot";
  const asksHealth = role === "passenger" && !caretaker;
  const agreements = 1 + Number(asksSafety) + Number(asksHealth);
  const missing = !termsTicked || (asksSafety && !safetyTicked);

  const tick = (set: (next: boolean) => void) => (next: boolean) => {
    setError(null);
    set(next);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await submitConsent({
        terms: termsTicked,
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

  const labels = {
    imprint: strings.imprint,
    privacy: strings.privacy,
    terms: strings.termsOfUse,
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
          {error ? <StepError>{error}</StepError> : null}
          <Button
            disabled={missing || pending}
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
        <Agreement
          checked={termsTicked}
          onCheckedChange={tick(setTermsTicked)}
          required
        >
          <LegalLinked
            text={strings.terms}
            labels={labels}
          />
        </Agreement>
        {asksSafety ? (
          <Agreement
            checked={safetyTicked}
            onCheckedChange={tick(setSafetyTicked)}
            required
          >
            {strings.safety}
          </Agreement>
        ) : null}
        {asksHealth ? (
          <Agreement
            checked={health}
            onCheckedChange={setHealth}
            optional
          >
            {strings.health}
          </Agreement>
        ) : null}
        <p className="pt-1 text-sm leading-normal text-ink-soft">
          <LegalLinked
            text={strings.notice}
            labels={labels}
          />
        </p>
      </div>
    </Step>
  );
}
