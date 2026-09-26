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
import { confirmationWord, matchesConfirmationWord } from "./confirmation-word";
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
  consequences?: string;
  errors: NotifyLabels["errors"];
};

export function ConfirmDeleteDialog({
  name,
  consequences = [],
  labels,
  locale,
  cancel,
  action,
  onDone,
  trigger,
}: {
  name: string;
  consequences?: string[];
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
  const word = confirmationWord(labels.word, name);
  const armed = matchesConfirmationWord(typed, word);
  const [labelBefore, labelAfter = ""] = labels.label.split("{word}");

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
          {consequences.length > 0 ? (
            <div className="grid gap-2 rounded-md bg-red-tint p-3">
              {labels.consequences ? (
                <p className="text-2sm font-medium text-red">
                  {labels.consequences}
                </p>
              ) : null}
              <ul className="grid gap-1 text-2sm text-ink">
                {consequences.map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-2"
                  >
                    <span
                      aria-hidden
                      className="size-1 shrink-0 rounded-full bg-red"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor={inputId}>
              <span>
                {labelBefore}
                <code className="rounded-sm bg-canvas-deeper px-1 font-mono text-ink">
                  {word}
                </code>
                {labelAfter}
              </span>
            </FieldLabel>
            <Input
              id={inputId}
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={word}
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
