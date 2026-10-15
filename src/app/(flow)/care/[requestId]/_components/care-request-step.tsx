"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useCharacter } from "@/components/character";
import {
  acceptCareRequestAction,
  declineCareRequestAction,
  type CareAnswerResult,
} from "@/features/passengers/actions";
import { haptics } from "@/lib/native/haptics";
import { Step, StepError } from "../../../_components/step";

const PEOPLE = "/passenger/profile/people";

type Strings = {
  title: string;
  body: string;
  accept: string;
  decline: string;
  acceptedTitle: string;
  acceptedBody: string;
  declinedTitle: string;
  declinedBody: string;
  open: string;
  errors: Record<
    "passengerChapterMismatch" | "tooManyRiders" | "generic",
    string
  >;
};

export function CareRequestStep({
  requestId,
  status,
  strings,
}: {
  requestId: string;
  status: "pending" | "accepted" | "declined";
  strings: Strings;
}) {
  const router = useRouter();
  const { oops } = useCharacter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const respond = (
    action: (id: string) => Promise<CareAnswerResult>,
    then: () => void,
  ) =>
    startTransition(async () => {
      const result = await action(requestId);
      if (!result.ok) {
        haptics.error();
        oops();
        setError(strings.errors[result.error]);
        return;
      }
      haptics.success();
      then();
    });

  if (status === "accepted")
    return (
      <Step
        title={strings.acceptedTitle}
        description={strings.acceptedBody}
        action={
          <Button
            asChild
            variant="brand"
            size="hero"
          >
            <Link href={PEOPLE}>{strings.open}</Link>
          </Button>
        }
      />
    );

  if (status === "declined")
    return (
      <Step
        title={strings.declinedTitle}
        description={strings.declinedBody}
      />
    );

  return (
    <Step
      title={strings.title}
      description={strings.body}
      action={
        <>
          {error && <StepError>{error}</StepError>}
          <Button
            disabled={pending}
            onClick={() =>
              respond(acceptCareRequestAction, () =>
                router.push(PEOPLE, { transitionTypes: ["nav-forward"] }),
              )
            }
            variant="brand"
            size="hero"
          >
            {strings.accept}
          </Button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(declineCareRequestAction, router.refresh)}
            className="mt-3 flex h-14 w-full items-center justify-center rounded-full border border-mint bg-mint-tint px-4 text-base font-medium text-ink transition-colors hover:bg-mint focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:opacity-50"
          >
            {strings.decline}
          </button>
        </>
      }
    />
  );
}
