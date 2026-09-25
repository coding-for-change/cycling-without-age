"use client";

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { clearDamageAction } from "../actions";

export type DamageClearLabels = {
  clear: string;
  clearTitle: string;
  clearNote: string;
  clearPlaceholder: string;
  clearSubmit: string;
  cleared: string;
  cancel: string;
  errors: NotifyLabels["errors"];
};

export function DamageClearDialog({
  damages,
  labels,
  open: controlled,
  onOpenChange,
  trigger,
}: {
  damages: { id: string; description: string }[];
  labels: DamageClearLabels;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const noteId = useId();
  const [own, setOwn] = useState(false);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  };
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = note.trim().length >= 2;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || pending) return;
    startTransition(async () => {
      const result = await clearDamageAction({
        damageIds: damages.map((damage) => damage.id),
        note,
      });
      notify(result, { done: labels.cleared, errors: labels.errors });
      if (!result.ok) return;
      setOpen(false);
      setNote("");
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setNote("");
      }}
    >
      {trigger === undefined ? (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-line text-2sm"
          >
            <Check aria-hidden />
            {labels.clear}
          </Button>
        </DialogTrigger>
      ) : (
        trigger
      )}
      <DialogContent>
        <form
          onSubmit={submit}
          onKeyDown={submitOnCmdEnter}
          aria-busy={pending}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{labels.clearTitle}</DialogTitle>
            {damages.length === 1 ? (
              <DialogDescription className="line-clamp-3 whitespace-pre-wrap text-ink-soft">
                {damages[0].description}
              </DialogDescription>
            ) : (
              <DialogDescription asChild>
                <ul className="grid list-disc gap-1 pl-5 text-ink-soft">
                  {damages.map((damage) => (
                    <li
                      key={damage.id}
                      className="line-clamp-2"
                    >
                      {damage.description}
                    </li>
                  ))}
                </ul>
              </DialogDescription>
            )}
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={noteId}>{labels.clearNote}</FieldLabel>
            <Textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={labels.clearPlaceholder}
              minLength={2}
              maxLength={500}
              rows={3}
              required
              autoFocus
              className="border-line text-base"
            />
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="min-h-11 border-line"
              >
                {labels.cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || !ready}
              className="min-h-11"
            >
              {labels.clearSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
