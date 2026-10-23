"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { withPasskeyStepUp } from "@/lib/passkey-client";
import { inviteSuperadminAction } from "../actions";

export type InviteSuperadminLabels = {
  invite: string;
  inviteBody: string;
  fields: { name: string; email: string };
  namePlaceholder: string;
  emailPlaceholder: string;
  send: string;
  cancel: string;
  invited: string;
  errors: NotifyLabels["errors"];
};

export function InviteSuperadminDrawer({
  labels,
  locale,
}: {
  labels: InviteSuperadminLabels;
  locale: Locale;
}) {
  const { creating, close } = useDrawerParam();
  const formId = useId();
  const nameId = useId();
  const emailId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setEmail("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invitee = { name: name.trim(), email: email.trim() };
    if (!invitee.name || !invitee.email) return;
    startTransition(async () => {
      const result = await withPasskeyStepUp(() =>
        inviteSuperadminAction(invitee),
      );
      notify(result, {
        done: formatMessage(labels.invited, { email: invitee.email }, locale),
        errors: labels.errors,
      });
      if (!result.ok) return;
      reset();
      close();
    });
  };

  return (
    <AppDrawer
      open={creating}
      onOpenChange={(next) => {
        if (next) return;
        reset();
        close();
      }}
      title={labels.invite}
      description={labels.inviteBody}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={close}
          >
            {labels.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={pending || !name.trim() || !email.trim()}
            variant="brand"
            className="min-h-11"
          >
            {labels.send}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={submit}
        onKeyDown={submitOnCmdEnter}
        aria-busy={pending}
        className="grid gap-5"
      >
        <Field>
          <FieldLabel htmlFor={nameId}>{labels.fields.name}</FieldLabel>
          <Input
            id={nameId}
            required
            autoFocus
            autoComplete="name"
            maxLength={120}
            placeholder={labels.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 border-line text-base"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={emailId}>{labels.fields.email}</FieldLabel>
          <Input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder={labels.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 border-line text-base"
          />
        </Field>
      </form>
    </AppDrawer>
  );
}
