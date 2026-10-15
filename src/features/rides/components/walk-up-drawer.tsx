"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { addWalkUpAction } from "../actions";
import { GUEST_NAME_MAX } from "../schemas";

const PARAM = "walkup";

export type WalkUpLabels = {
  open: string;
  title: string;
  body: string;
  firstName: string;
  lastName: string;
  submit: string;
  submitting: string;
  added: string;
  errors: NotifyLabels["errors"];
};

/** Lifecycle 6B: someone turned up without a booking, and rides anyway. */
export function WalkUpDrawer({
  rideId,
  language,
  labels,
  triggerClassName,
}: {
  rideId: string;
  language: Locale;
  labels: WalkUpLabels;
  triggerClassName?: string;
}) {
  const searchParams = useSearchParams();
  const { go, withParam } = useDrawerParam();
  const open = searchParams.get(PARAM) === "1";
  const close = () => go((params) => params.delete(PARAM));

  return (
    <>
      <Button
        asChild
        variant="outline"
        className={cn("min-h-11 rounded-full border-line", triggerClassName)}
      >
        <Link
          href={withParam(PARAM, "1")}
          replace
          scroll={false}
        >
          <UserPlus aria-hidden />
          {labels.open}
        </Link>
      </Button>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={labels.title}
        description={labels.body}
      >
        {open ? (
          <WalkUpForm
            rideId={rideId}
            language={language}
            labels={labels}
            onDone={close}
          />
        ) : null}
      </AppDrawer>
    </>
  );
}

function WalkUpForm({
  rideId,
  language,
  labels,
  onDone,
}: {
  rideId: string;
  language: Locale;
  labels: WalkUpLabels;
  onDone: () => void;
}) {
  const ids = { first: useId(), last: useId() };
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);
  const ready = firstName.trim().length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !ready) return;
    setPending(true);
    const result = await addWalkUpAction({ rideId, firstName, lastName });
    setPending(false);
    notify(result, {
      done: formatMessage(
        labels.added,
        { name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") },
        language,
      ),
      errors: labels.errors,
    });
    if (result.ok) onDone();
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={submitOnCmdEnter}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={ids.first}>{labels.firstName}</FieldLabel>
          <Input
            id={ids.first}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            maxLength={GUEST_NAME_MAX}
            autoComplete="off"
            autoCapitalize="words"
            required
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={ids.last}>{labels.lastName}</FieldLabel>
          <Input
            id={ids.last}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            maxLength={GUEST_NAME_MAX}
            autoComplete="off"
            autoCapitalize="words"
          />
        </Field>
      </div>
      <Button
        type="submit"
        disabled={pending || !ready}
        className="min-h-11 rounded-full"
      >
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
