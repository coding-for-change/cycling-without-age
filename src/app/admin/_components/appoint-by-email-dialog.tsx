"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
  type ActionResult,
  type NotifyLabels,
} from "./action-feedback";

export function AppointByEmailDialog({
  triggerLabel,
  title,
  emailLabel,
  hint,
  placeholder,
  labels,
  action,
}: {
  triggerLabel: string;
  title: string;
  emailLabel: string;
  hint: string;
  placeholder?: string;
  labels: NotifyLabels;
  action: (email: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    startTransition(async () => {
      const result = await action(value);
      notify(result, { ...labels, done: fill(labels.done, { email: value }) });
      if (!result.ok) return;
      setEmail("");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEmail("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="min-h-11"
        >
          <UserPlus aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-ink-soft">
              {hint}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={inputId}>{emailLabel}</FieldLabel>
            <Input
              id={inputId}
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder={placeholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 border-line text-base"
            />
          </Field>
          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || !email.trim()}
              className="min-h-11"
            >
              {triggerLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
