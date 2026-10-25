"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useCharacter } from "@/components/character";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/native/haptics";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { Step, StepError } from "../../../_components/step";
import {
  acceptAdminInviteAction,
  type AcceptAdminInviteResult,
} from "../actions";

type Failure = Extract<AcceptAdminInviteResult, { ok: false }>["error"];

type Strings = {
  title: string;
  body: string;
  accept: string;
  accepted: { title: string; body: string; open: string };
  expired: { title: string; body: string };
  revoked: { title: string; body: string };
  errors: Record<Failure, string>;
};

export function AdminInviteStep({
  inviteId,
  status,
  strings,
}: {
  inviteId: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  strings: Strings;
}) {
  const { oops } = useCharacter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accept = () =>
    startTransition(async () => {
      const result = await acceptAdminInviteAction(inviteId);
      if (!result.ok) {
        haptics.error();
        oops();
        setError(strings.errors[result.error]);
        return;
      }
      haptics.success();
      window.location.assign(result.next);
    });

  if (status === "accepted")
    return (
      <Step
        title={strings.accepted.title}
        description={strings.accepted.body}
        action={
          <Button
            asChild
            variant="brand"
            size="hero"
          >
            <Link href={PERSPECTIVE_HOME.admin}>{strings.accepted.open}</Link>
          </Button>
        }
      />
    );

  if (status === "expired")
    return (
      <Step
        title={strings.expired.title}
        description={strings.expired.body}
      />
    );

  if (status === "revoked")
    return (
      <Step
        title={strings.revoked.title}
        description={strings.revoked.body}
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
            onClick={accept}
            variant="brand"
            size="hero"
          >
            {strings.accept}
          </Button>
        </>
      }
    />
  );
}
