"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
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
import { fill } from "@/lib/utils";
import {
  notify,
  type NotifyLabels,
} from "../../../_components/action-feedback";
import { deleteChapterAction } from "../../actions";

export type DeleteChapterLabels = {
  open: string;
  title: string;
  body: string;
  footprint: string;
  label: string;
  word: string;
  submit: string;
  done: string;
  errors: NotifyLabels["errors"];
};

export function DeleteChapterDialog({
  chapterId,
  name,
  footprint,
  backHref,
  labels,
  cancel,
}: {
  chapterId: string;
  name: string;
  footprint: {
    members: number;
    passengers: number;
    pendingApplications: number;
  };
  backHref: string;
  labels: DeleteChapterLabels;
  cancel: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const armed = typed === labels.word;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!armed) return;
    startTransition(async () => {
      const result = await deleteChapterAction(chapterId);
      notify(result, {
        done: fill(labels.done, { name }),
        errors: labels.errors,
      });
      if (!result.ok) return;
      router.push(backHref);
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
        <Button
          variant="outline"
          className="h-9 justify-start border-line text-2sm text-red hover:bg-red-tint hover:text-red"
        >
          <Trash2 aria-hidden />
          {labels.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{fill(labels.title, { name })}</DialogTitle>
            <DialogDescription className="text-ink-soft">
              {labels.body}
            </DialogDescription>
          </DialogHeader>
          <p className="text-2sm text-ink-soft">
            {fill(labels.footprint, {
              members: footprint.members,
              passengers: footprint.passengers,
              pending: footprint.pendingApplications,
            })}
          </p>
          <Field>
            <FieldLabel htmlFor={inputId}>
              {fill(labels.label, { word: labels.word })}
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
              className="min-h-11 bg-red text-white hover:bg-red-hover"
            >
              {labels.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
