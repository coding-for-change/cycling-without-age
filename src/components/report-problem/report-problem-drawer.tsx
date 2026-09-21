"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { captureFeedback } from "@sentry/nextjs";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { haptics } from "@/lib/native/haptics";
import {
  REPORT_MAX_LENGTH,
  REPORT_MIN_LENGTH,
  type ReportProblemStrings,
} from "./strings";

export function ReportProblemDrawer({
  open,
  onOpenChange,
  strings,
  associatedEventId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strings: ReportProblemStrings;
  associatedEventId?: string;
}) {
  const fieldId = useId();
  const [message, setMessage] = useState("");

  const close = () => {
    setMessage("");
    onOpenChange(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();

    if (text.length < REPORT_MIN_LENGTH) {
      haptics.error();
      toast.error(strings.tooShort);
      return;
    }

    try {
      captureFeedback(
        {
          message: text,
          ...(associatedEventId ? { associatedEventId } : {}),
        },
        { includeReplay: true },
      );
    } catch {
      haptics.error();
      toast.error(strings.failed);
      return;
    }

    close();
    haptics.success();
    toast.success(strings.done);
  };

  return (
    <AppDrawer
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={strings.title}
      description={strings.description}
    >
      <form
        onSubmit={submit}
        onKeyDown={submitOnCmdEnter}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fieldId}>{strings.title}</Label>
          <Textarea
            id={fieldId}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={REPORT_MAX_LENGTH}
            placeholder={strings.placeholder}
            className="min-h-32"
            autoFocus
          />
          <p
            aria-live="polite"
            className="text-2sm text-ink-soft"
          >
            {message.length}/{REPORT_MAX_LENGTH}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={close}
          >
            {strings.cancel}
          </Button>
          <Button
            type="submit"
            variant="brand"
            disabled={message.trim().length < REPORT_MIN_LENGTH}
          >
            {strings.submit}
          </Button>
        </div>
      </form>
    </AppDrawer>
  );
}
