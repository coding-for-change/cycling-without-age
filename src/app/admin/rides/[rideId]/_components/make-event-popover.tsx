"use client";

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ActionResult } from "@/components/action-feedback";
import { submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  parseCapacity,
  RIDE_MAX_CAPACITY,
  RIDE_TITLE_MAX,
} from "@/features/rides/schemas";
import { haptics } from "@/lib/native/haptics";

export type MakeEventLabels = {
  heading: string;
  hint: string;
  title: string;
  capacity: string;
  confirm: string;
  saving: string;
  cancel: string;
  errors: { generic: string } & Record<string, string>;
};

export const EVENT_CAPACITY_DEFAULT = 10;

export function MakeEventPopover({
  open,
  onCancel,
  defaultTitle,
  riders,
  onConfirm,
  labels,
  children,
}: {
  open: boolean;
  onCancel: () => void;
  defaultTitle: string;
  riders: number;
  onConfirm: (details: {
    title: string;
    capacity: number;
  }) => Promise<ActionResult>;
  labels: MakeEventLabels;
  children: ReactNode;
}) {
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <PopoverAnchor asChild>
        <div>{children}</div>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="w-72 p-3"
      >
        {open ? (
          <MakeEventForm
            defaultTitle={defaultTitle}
            riders={riders}
            onConfirm={onConfirm}
            onCancel={onCancel}
            labels={labels}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function MakeEventForm({
  defaultTitle,
  riders,
  onConfirm,
  onCancel,
  labels,
}: {
  defaultTitle: string;
  riders: number;
  onConfirm: (details: {
    title: string;
    capacity: number;
  }) => Promise<ActionResult>;
  onCancel: () => void;
  labels: MakeEventLabels;
}) {
  const ids = { title: useId(), capacity: useId(), error: useId() };
  const min = Math.max(1, riders);
  const [title, setTitle] = useState(defaultTitle.slice(0, RIDE_TITLE_MAX));
  const [capacity, setCapacity] = useState(
    String(Math.min(RIDE_MAX_CAPACITY, Math.max(min, EVENT_CAPACITY_DEFAULT))),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seats = parseCapacity(capacity, min);
  const valid = title.trim().length > 0 && seats !== null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || seats === null || !valid) return;
    setError(null);
    startTransition(async () => {
      const result = await onConfirm({ title: title.trim(), capacity: seats });
      if (result.ok) return;
      haptics.error();
      setError(labels.errors[result.error] ?? labels.errors.generic);
    });
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={submitOnCmdEnter}
      aria-busy={pending}
      aria-describedby={error ? ids.error : undefined}
      className="grid gap-3"
    >
      <div className="grid gap-1">
        <p className="text-2sm font-medium">{labels.heading}</p>
        <p className="text-xs text-ink-soft">{labels.hint}</p>
      </div>
      <div className="grid gap-1">
        <label
          htmlFor={ids.title}
          className="text-xs text-ink-soft"
        >
          {labels.title}
        </label>
        <Input
          id={ids.title}
          value={title}
          maxLength={RIDE_TITLE_MAX}
          required
          autoFocus
          onChange={(change) => setTitle(change.target.value)}
          className="h-9 border-line text-2sm"
        />
      </div>
      <div className="grid gap-1">
        <label
          htmlFor={ids.capacity}
          className="text-xs text-ink-soft"
        >
          {labels.capacity}
        </label>
        <Input
          id={ids.capacity}
          type="number"
          inputMode="numeric"
          min={min}
          max={RIDE_MAX_CAPACITY}
          required
          value={capacity}
          onChange={(change) => setCapacity(change.target.value)}
          className="h-9 border-line text-2sm tabular-nums"
        />
      </div>
      {error ? (
        <p
          id={ids.error}
          role="alert"
          className="text-xs text-red-ink"
        >
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-1.25">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          {labels.cancel}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !valid}
        >
          {pending ? labels.saving : labels.confirm}
        </Button>
      </div>
    </form>
  );
}
