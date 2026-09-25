"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  notify,
  type ActionResult,
  type NotifyLabels,
} from "@/components/action-feedback";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export function ConfirmButton({
  icon,
  label,
  title,
  body,
  confirm,
  cancel,
  destructive = false,
  done,
  errors,
  action,
  onDone,
  className,
  size = "sm",
  variant = "outline",
}: {
  icon?: ReactNode;
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  destructive?: boolean;
  done: string;
  errors: NotifyLabels["errors"];
  action: () => Promise<ActionResult>;
  onDone?: () => void;
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (destructive) haptics.tap();
    startTransition(async () => {
      const result = await action();
      notify(result, { done, errors });
      if (!result.ok) return;
      setOpen(false);
      onDone?.();
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            destructive && "text-red hover:bg-red-tint hover:text-red",
            className,
          )}
        >
          {icon}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent aria-busy={pending}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-ink-soft">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            className="min-h-11 border-line"
          >
            {cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              run();
            }}
            variant={destructive ? "brand" : "default"}
            className="min-h-11"
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
