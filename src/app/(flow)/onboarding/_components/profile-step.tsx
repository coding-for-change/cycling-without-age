"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { OnboardingRole } from "@/lib/onboarding";
import type { StepDefaults } from "./step-page";
import { Step, StepError, type StepProgress } from "../../_components/step";
import { submitProfile } from "../actions";

type Gender = "female" | "male" | "other";

type Strings = {
  title: string;
  titlePilot: string;
  body: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  genders: Record<Gender, string>;
  forSomeoneElse: string;
  relationship: { label: string; options: Record<string, string> };
  errors: Record<string, string>;
};

const GENDERS: Gender[] = ["female", "male", "other"];

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
  // Seeded from what they saved, so the back button leads to their own answers
  // rather than a blank form.
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [birthDate, setBirthDate] = useState(defaults.birthDate);
  const [gender, setGender] = useState<Gender | null>(defaults.gender);
  const [helping, setHelping] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const complete = Boolean(
    firstName.trim() && lastName.trim() && birthDate && gender,
  );

  const send = (details: object | null, helperRelationship?: string) =>
    startTransition(async () => {
      const result = await submitProfile(details, helperRelationship);
      if (!result.ok) {
        haptics.error();
        oops();
        setError(strings.errors[result.error] ?? strings.errors.generic);
        return;
      }
      haptics.success();
      router.push(result.next, { transitionTypes: ["nav-forward"] });
    });

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
            onClick={() => send({ firstName, lastName, birthDate, gender })}
            variant="brand"
            size="hero"
          >
            {continueLabel}
          </Button>

          {/* Booking for someone who cannot use a phone is a first-class path,
              not an escape hatch, so it gets the same pill as the primary — in
              mint, the caretaking colour, which is what this path is. Red stays
              with the one hero action. */}
          {role === "passenger" && (
            <>
              {helping && (
                <div className="mt-4">
                  <Label
                    htmlFor="relationship"
                    className="mb-1.5 text-sm font-medium text-ink-soft"
                  >
                    {strings.relationship.label}
                  </Label>
                  <select
                    id="relationship"
                    value={relationship}
                    onChange={(event) => setRelationship(event.target.value)}
                    className="h-12 w-full rounded-(--r-card) border border-line bg-canvas px-3 text-base text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
                  >
                    <option value="">—</option>
                    {Object.entries(strings.relationship.options).map(
                      ([key, label]) => (
                        <option
                          key={key}
                          value={key}
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  haptics.tap();
                  if (!helping) {
                    setHelping(true);
                    return;
                  }
                  send(null, relationship || undefined);
                }}
                className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-mint bg-mint-tint px-4 text-base font-medium text-ink transition-colors hover:bg-mint focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:opacity-50"
              >
                {helping ? continueLabel : strings.forSomeoneElse}
                {!helping && (
                  <ArrowRight
                    className="size-4"
                    aria-hidden
                  />
                )}
              </button>
            </>
          )}
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

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-soft">
            {strings.gender}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={gender === option}
                onClick={() => {
                  haptics.selectionChanged();
                  setGender(option);
                }}
                className={cn(
                  "min-h-12 rounded-(--r-card) border px-2 text-sm transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                  gender === option
                    ? "border-transparent bg-mint-tint font-medium text-ink ring-1 ring-mint"
                    : "border-line bg-canvas text-ink-soft hover:bg-canvas-deep",
                )}
              >
                {strings.genders[option]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Step>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-1.5 text-sm font-medium text-ink-soft"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
