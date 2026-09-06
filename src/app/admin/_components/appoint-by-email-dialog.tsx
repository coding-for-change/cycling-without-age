"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fill } from "@/lib/utils";
import {
  notify,
  type ActionResult,
  type NotifyLabels,
} from "./action-feedback";
import { AdminDrawer, submitOnCmdEnter } from "./admin-drawer";

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
  const formId = useId();
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
    <>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        <UserPlus aria-hidden />
        {triggerLabel}
      </Button>

      <AdminDrawer
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEmail("");
        }}
        title={title}
        description={hint}
        footer={
          <Button
            type="submit"
            form={formId}
            disabled={pending || !email.trim()}
            className="min-h-11 bg-red text-white hover:bg-red-hover"
          >
            {triggerLabel}
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
            <FieldLabel htmlFor={inputId}>{emailLabel}</FieldLabel>
            <Input
              id={inputId}
              type="email"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              placeholder={placeholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 border-line text-base"
            />
          </Field>
        </form>
      </AdminDrawer>
    </>
  );
}
