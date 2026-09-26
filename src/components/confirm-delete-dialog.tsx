"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import {
  notify,
  type ActionResult,
  type NotifyLabels,
} from "@/components/action-feedback";

export type ConfirmDeleteLabels = {
  open: string;
  title: string;
  body: string;
  label: string;
  word: string;
  submit: string;
  done: string;
  errors: NotifyLabels["errors"];
};

export function ConfirmDeleteDialog({
  name,
  footprint,
  labels,
  locale,
  cancel,
  action,
  onDone,
  trigger,
}: {
  name: string;
  footprint?: string;
  labels: ConfirmDeleteLabels;
  locale: Locale;
  cancel: string;
  action: () => Promise<ActionResult>;
  onDone?: () => void;
  trigger?: ReactNode;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const armed = typed === labels.word;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!armed) return;
    startTransition(async () => {
      const result = await action();
      notify(result, {
        done: formatMessage(labels.done, { name }, locale),
        errors: labels.errors,
      });
      if (!result.ok) return;
      setOpen(false);
      setTyped("");
      onDone?.();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="h-9 justify-start border-line text-2sm text-red hover:bg-red-tint hover:text-red"
          >
            <Trash2 aria-hidden />
            {labels.open}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>
              {formatMessage(labels.title, { name }, locale)}
            </DialogTitle>
            <DialogDescription className="text-ink-soft">
              {labels.body}
            </DialogDescription>
          </DialogHeader>
          {footprint ? (
            <p className="text-2sm text-ink-soft">{footprint}</p>
          ) : null}
          <Field>
            <FieldLabel htmlFor={inputId}>
              {formatMessage(labels.label, { word: labels.word }, locale)}
            </FieldLabel>
            <Input
              id={inputId}
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={labels.word}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="h-11 border-line text-base"
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
                {cancel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || !armed}
              variant="brand"
              className="min-h-11"
            >
              {labels.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
