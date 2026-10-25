"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCharacter } from "@/components/character";
import { haptics } from "@/lib/native/haptics";
import { Agreement, LegalLinked } from "./agreement";
import { Step, StepError } from "../../_components/step";
import { submitTerms } from "../actions";

type Strings = {
  title: string;
  description: string;
  edition: string;
  read: string;
  accept: string;
  notice: string;
  privacy: string;
  termsOfUse: string;
  required: string;
  error: string;
};

export function TermsStep({
  strings,
  continueLabel,
}: {
  strings: Strings;
  continueLabel: string;
}) {
  const router = useRouter();
  const { oops } = useCharacter();

  const [ticked, setTicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const labels = { privacy: strings.privacy, terms: strings.termsOfUse };

  const submit = () => {
    startTransition(async () => {
      const result = await submitTerms({ terms: ticked });
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
      title={strings.title}
      description={strings.description}
      action={
        <>
          {error ? (
            <StepError>{error}</StepError>
          ) : (
            !ticked && (
              <p className="mb-2 text-center text-sm text-ink-soft">
                {strings.required}
              </p>
            )
          )}
          <Button
            disabled={!ticked || pending}
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
        <div className="flex items-center gap-3 rounded-(--r-card) border border-line bg-canvas p-3.5">
          <FileText
            aria-hidden
            className="size-5 shrink-0 text-ink-soft"
          />
          <div className="min-w-0 text-sm leading-normal">
            <p className="font-medium text-ink">
              <LegalLinked
                text={strings.read}
                labels={labels}
              />
            </p>
            <p className="text-ink-soft">{strings.edition}</p>
          </div>
        </div>
        <Agreement
          checked={ticked}
          onCheckedChange={(next) => {
            setError(null);
            setTicked(next);
          }}
        >
          <LegalLinked
            text={strings.accept}
            labels={labels}
          />
        </Agreement>
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
