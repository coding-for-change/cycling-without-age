"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldMinus, UserMinus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/utils";
import { changeMemberRoleAction } from "../actions";
import { notify, type NotifyLabels } from "../../_components/action-feedback";

type Change = "promote" | "demote" | "remove";

export type MemberActionLabels = {
  promote: string;
  demote: string;
  remove: string;
  promoteTitle: string;
  promoteBody: string;
  demoteTitle: string;
  demoteBody: string;
  removeTitle: string;
  removeBody: string;
  promoted: string;
  demoted: string;
  removed: string;
  errors: NotifyLabels["errors"];
};

export type MemberActionTarget = {
  userId: string;
  chapterId: string;
  name: string;
  isAdmin: boolean;
  isSelf: boolean;
};

type TextKey = Exclude<keyof MemberActionLabels, "errors">;

const COPY: Record<Change, { title: TextKey; body: TextKey; done: TextKey }> = {
  promote: { title: "promoteTitle", body: "promoteBody", done: "promoted" },
  demote: { title: "demoteTitle", body: "demoteBody", done: "demoted" },
  remove: { title: "removeTitle", body: "removeBody", done: "removed" },
};

export function MemberActions({
  target,
  labels,
  cancel,
}: {
  target: MemberActionTarget;
  labels: MemberActionLabels;
  cancel: string;
}) {
  const [change, setChange] = useState<Change | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = change ? COPY[change] : null;
  const named = (key: TextKey) => fill(labels[key], { name: target.name });

  // Promoting yourself is allowed (a country admin joining a chapter); taking
  // your own rights or seat away is not — the use case refuses it too.
  const canToggleAdmin = !(target.isSelf && target.isAdmin);
  const canRemove = !target.isSelf;
  if (!canToggleAdmin && !canRemove) return null;

  const confirm = () => {
    if (!change) return;
    const done = COPY[change].done;
    startTransition(async () => {
      const result = await changeMemberRoleAction({
        userId: target.userId,
        chapterId: target.chapterId,
        change,
      });
      notify(result, { done: named(done), errors: labels.errors });
      if (!result.ok) return;
      setChange(null);
    });
  };

  return (
    <>
      <div className="grid gap-1.25">
        {canToggleAdmin ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChange(target.isAdmin ? "demote" : "promote")}
            className="w-full justify-start border-line bg-canvas text-2sm text-ink-soft hover:border-ink-faint hover:bg-canvas hover:text-ink hover:shadow-soft"
          >
            {target.isAdmin ? (
              <ShieldMinus aria-hidden />
            ) : (
              <ShieldCheck aria-hidden />
            )}
            {target.isAdmin ? labels.demote : labels.promote}
          </Button>
        ) : null}
        {canRemove ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChange("remove")}
            className="w-full justify-start border-line bg-canvas text-2sm text-ink-soft hover:border-ink-faint hover:bg-canvas hover:text-ink hover:shadow-soft"
          >
            <UserMinus aria-hidden />
            {labels.remove}
          </Button>
        ) : null}
      </div>

      <AlertDialog
        open={change !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setChange(null);
        }}
      >
        {copy ? (
          <AlertDialogContent aria-busy={pending}>
            <AlertDialogHeader>
              <AlertDialogTitle>{named(copy.title)}</AlertDialogTitle>
              <AlertDialogDescription className="text-ink-soft">
                {named(copy.body)}
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
                  confirm();
                }}
                variant={change === "remove" ? "brand" : "default"}
                className="min-h-11"
              >
                {change === "remove"
                  ? labels.remove
                  : target.isAdmin
                    ? labels.demote
                    : labels.promote}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </>
  );
}
