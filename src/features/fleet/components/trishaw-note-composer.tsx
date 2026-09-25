"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { notify, type NotifyLabels } from "@/components/action-feedback";
import { submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addTrishawNoteAction } from "../actions";

export type TrishawNoteComposerLabels = {
  label: string;
  placeholder: string;
  submit: string;
  added: string;
  errors: NotifyLabels["errors"];
};

export function TrishawNoteComposer({
  trishawId,
  labels,
}: {
  trishawId: string;
  labels: TrishawNoteComposerLabels;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = text.trim().length > 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || pending) return;
    startTransition(async () => {
      const result = await addTrishawNoteAction({ trishawId, text });
      notify(result, { done: labels.added, errors: labels.errors });
      if (result.ok) setText("");
    });
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={submitOnCmdEnter}
      aria-busy={pending}
      className="grid gap-2 rounded-xl border border-line p-3 focus-within:border-ink-soft"
    >
      <label
        htmlFor={id}
        className="sr-only"
      >
        {labels.label}
      </label>
      <Textarea
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={labels.placeholder}
        maxLength={2000}
        rows={2}
        className="min-h-12 resize-none border-none p-0 text-2sm shadow-none focus-visible:ring-0"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!ready || pending}
          className="h-8 text-2sm"
        >
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}
