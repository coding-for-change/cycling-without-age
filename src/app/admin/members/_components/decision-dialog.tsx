"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { decideApplicationAction } from "../actions";
import { AdminDrawer, submitOnCmdEnter } from "../../_components/admin-drawer";
import { notify, type NotifyLabels } from "@/components/action-feedback";

export type DecisionTarget = {
  applicationId: string;
  name: string;
  approve: boolean;
};

export type DecisionLabels = {
  approve: string;
  reject: string;
  approveTitle: string;
  approveBody: string;
  rejectTitle: string;
  rejectBody: string;
  noteLabel: string;
  notePlaceholder: string;
  approved: string;
  rejected: string;
};

export function DecisionDialog({
  target,
  onClose,
  labels,
  errors,
  locale,
}: {
  target: DecisionTarget | null;
  onClose: () => void;
  labels: DecisionLabels;
  errors: NotifyLabels["errors"];
  locale: Locale;
}) {
  const formId = useId();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const close = () => {
    setNote("");
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    const trimmed = note.trim();
    startTransition(async () => {
      const result = await decideApplicationAction({
        applicationId: target.applicationId,
        approve: target.approve,
        note: trimmed || undefined,
      });
      notify(result, {
        done: formatMessage(
          target.approve ? labels.approved : labels.rejected,
          { name: target.name },
          locale,
        ),
        errors,
      });
      if (!result.ok) return;
      close();
    });
  };

  if (!target) return null;

  return (
    <AdminDrawer
      open
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
      dismissible={!pending}
      title={formatMessage(
        target.approve ? labels.approveTitle : labels.rejectTitle,
        { name: target.name },
        locale,
      )}
      description={target.approve ? labels.approveBody : labels.rejectBody}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={pending}
          variant={target.approve ? "brand" : "default"}
          className="min-h-11"
        >
          {target.approve ? labels.approve : labels.reject}
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
            {formatMessage(labels.noteLabel, { name: target.name }, locale)}
          </FieldLabel>
          <Textarea
            id={noteId}
            autoFocus
            maxLength={500}
            rows={3}
            placeholder={labels.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="border-line"
          />
        </Field>
      </form>
    </AdminDrawer>
  );
}
