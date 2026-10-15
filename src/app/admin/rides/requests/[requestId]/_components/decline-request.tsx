"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { declineRideRequestAction } from "@/features/ride-requests/actions";
import { REQUEST_LIMITS } from "@/features/ride-requests/schemas";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

export type DeclineLabels = {
  open: string;
  title: string;
  body: string;
  note: string;
  placeholder: string;
  submit: string;
  done: string;
};

/**
 * Declining is a decision with a note for the requester, so it opens in a
 * drawer whose open state is the URL (`?decline=1`).
 */
export function DeclineRequest({
  requestId,
  name,
  language,
  labels,
  errors,
}: {
  requestId: string;
  name: string;
  language: Locale;
  labels: DeclineLabels;
  errors: NotifyLabels["errors"];
}) {
  const formId = useId();
  const noteId = useId();
  const { go, withParam } = useDrawerParam();
  const open = useSearchParams().get("decline") === "1";
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const close = () =>
    go((params) => {
      params.delete("decline");
    });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const result = await declineRideRequestAction({
        requestId,
        note: note.trim() || null,
      });
      notify(result, { done: labels.done, errors });
      if (!result.ok) return;
      setNote("");
      close();
    });
  };

  return (
    <>
      <Button
        asChild
        variant="outline"
        className="w-full"
      >
        <a
          href={withParam("decline", "1")}
          onClick={(event) => {
            event.preventDefault();
            go((params) => params.set("decline", "1"));
          }}
        >
          {labels.open}
        </a>
      </Button>
      <AppDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) close();
        }}
        dismissible={!pending}
        title={labels.title}
        description={formatMessage(labels.body, { name }, language)}
        footer={
          <Button
            type="submit"
            form={formId}
            disabled={pending}
            className="min-h-11"
          >
            {labels.submit}
          </Button>
        }
      >
        <form
          id={formId}
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="grid gap-4"
        >
          <Field>
            <FieldLabel htmlFor={noteId}>
              {formatMessage(labels.note, { name }, language)}
            </FieldLabel>
            <Textarea
              id={noteId}
              autoFocus
              maxLength={REQUEST_LIMITS.decisionNote}
              rows={4}
              placeholder={labels.placeholder}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="border-line"
            />
          </Field>
        </form>
      </AppDrawer>
    </>
  );
}
