"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { fill } from "@/lib/utils";
import { decideApplicationAction } from "../actions";
import { notify, type NotifyLabels } from "../../_components/action-feedback";

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
}: {
  target: DecisionTarget | null;
  onClose: () => void;
  labels: DecisionLabels;
  errors: NotifyLabels["errors"];
}) {
  const router = useRouter();
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
        done: fill(target.approve ? labels.approved : labels.rejected, {
          name: target.name,
        }),
        errors,
      });
      if (!result.ok) return;
      close();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
    >
      {target ? (
        <DialogContent>
          <form
            onSubmit={submit}
            aria-busy={pending}
            className="grid gap-4"
          >
            <DialogHeader>
              <DialogTitle>
                {fill(
                  target.approve ? labels.approveTitle : labels.rejectTitle,
                  { name: target.name },
                )}
              </DialogTitle>
              <DialogDescription className="text-ink-soft">
                {target.approve ? labels.approveBody : labels.rejectBody}
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={noteId}>
                {fill(labels.noteLabel, { name: target.name })}
              </FieldLabel>
              <Textarea
                id={noteId}
                maxLength={500}
                rows={3}
                placeholder={labels.notePlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="border-line"
              />
            </Field>
            <DialogFooter>
              <Button
                type="submit"
                disabled={pending}
                className={
                  target.approve
                    ? "min-h-11 bg-red text-white hover:bg-red-hover"
                    : "min-h-11"
                }
              >
                {target.approve ? labels.approve : labels.reject}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
