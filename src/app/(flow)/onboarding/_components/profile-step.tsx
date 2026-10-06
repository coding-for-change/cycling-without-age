"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, GenderChoice, type Gender } from "@/components/person-fields";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import type { OnboardingRole } from "@/lib/onboarding";
import type { StepDefaults } from "./step-page";
import { Step, StepError, type StepProgress } from "../../_components/step";
import { submitProfile, type StepResult } from "../actions";

type Strings = {
  title: string;
  titlePilot: string;
  body: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  genders: Record<Gender, string>;
  errors: Record<string, string>;
};

export function ProfileStep({
  role,
  progress,
  defaults,
  strings,
  continueLabel,
}: {
  role: OnboardingRole;
  progress: StepProgress | null;
  defaults: StepDefaults;
  strings: Strings;
  continueLabel: string;
}) {
  const router = useRouter();
  const { oops } = useCharacter();
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [birthDate, setBirthDate] = useState(defaults.birthDate);
  const [gender, setGender] = useState<Gender | null>(defaults.gender);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const complete = Boolean(
    firstName.trim() && lastName.trim() && birthDate && gender,
  );

  const finish = (result: StepResult) => {
    if (!result.ok) {
      haptics.error();
      oops();
      setError(strings.errors[result.error] ?? strings.errors.generic);
      return;
    }
    haptics.success();
    router.push(result.next, { transitionTypes: ["nav-forward"] });
  };

  const send = () =>
    startTransition(async () =>
      finish(await submitProfile({ firstName, lastName, birthDate, gender })),
    );

  return (
    <Step
      title={role === "pilot" ? strings.titlePilot : strings.title}
      description={strings.body}
      progress={progress ?? undefined}
      action={
        <>
          {error && <StepError>{error}</StepError>}
          <Button
            disabled={!complete || pending}
            onClick={send}
            variant="brand"
            size="hero"
          >
            {continueLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="first-name"
            label={strings.firstName}
          >
            <Input
              id="first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              className="h-12 rounded-(--r-card) border-line text-base"
            />
          </Field>
          <Field
            id="last-name"
            label={strings.lastName}
          >
            <Input
              id="last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              className="h-12 rounded-(--r-card) border-line text-base"
            />
          </Field>
        </div>

        {/* The platform date input, not a picker component: it is already
            localised, already keyboard- and screen-reader-reachable, and on a
            phone it opens the OS wheel a 90-year-old has used before. */}
        <Field
          id="birth-date"
          label={strings.birthDate}
        >
          <Input
            id="birth-date"
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setBirthDate(event.target.value)}
            autoComplete="bday"
            className="h-12 rounded-(--r-card) border-line text-base"
          />
        </Field>

        <GenderChoice
          legend={strings.gender}
          labels={strings.genders}
          value={gender}
          onChange={setGender}
        />
      </div>
    </Step>
  );
}
