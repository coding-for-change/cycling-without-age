"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  EllipsisVertical,
  History,
  ShieldCheck,
  UserMinus,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fill } from "@/lib/utils";
import { changeMemberRoleAction } from "../actions";
import { notify, type NotifyLabels } from "../../_components/action-feedback";

type Change = "promote" | "demote" | "remove";

export type MemberMenuLabels = {
  actions: string;
  history: string;
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

export type MemberMenuTarget = {
  userId: string;
  chapterId: string;
  name: string;
  isAdmin: boolean;
  isSelf?: boolean;
};

type TextKey = Exclude<keyof MemberMenuLabels, "errors">;

const COPY: Record<Change, { title: TextKey; body: TextKey; done: TextKey }> = {
  promote: { title: "promoteTitle", body: "promoteBody", done: "promoted" },
  demote: { title: "demoteTitle", body: "demoteBody", done: "demoted" },
  remove: { title: "removeTitle", body: "removeBody", done: "removed" },
};

export function MemberMenu({
  target,
  labels,
  cancel,
  historyHref,
}: {
  target: MemberMenuTarget;
  labels: MemberMenuLabels;
  cancel: string;
  historyHref?: string;
}) {
  const router = useRouter();
  const [change, setChange] = useState<Change | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = change ? COPY[change] : null;
  const named = (key: TextKey) => fill(labels[key], { name: target.name });

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
      router.refresh();
    });
  };

  if (target.isSelf && target.isAdmin && !historyHref) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={named("actions")}
            className="size-11"
          >
            <EllipsisVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-56 rounded-2xl border-line p-2"
        >
          {historyHref ? (
            <>
              <DropdownMenuItem
                asChild
                className="gap-3 rounded-xl py-2.5"
              >
                <Link href={historyHref}>
                  <History
                    aria-hidden
                    className="size-4 text-ink-soft"
                  />
                  {labels.history}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-line" />
            </>
          ) : null}
          {!(target.isSelf && target.isAdmin) && (
            <DropdownMenuItem
              className="gap-3 rounded-xl py-2.5"
              onSelect={() => setChange(target.isAdmin ? "demote" : "promote")}
            >
              <ShieldCheck
                aria-hidden
                className="size-4 text-ink-soft"
              />
              {target.isAdmin ? labels.demote : labels.promote}
            </DropdownMenuItem>
          )}
          {!target.isSelf && (
            <DropdownMenuItem
              className="gap-3 rounded-xl py-2.5"
              onSelect={() => setChange("remove")}
            >
              <UserMinus
                aria-hidden
                className="size-4 text-ink-soft"
              />
              {labels.remove}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
                className={
                  change === "remove"
                    ? "min-h-11 bg-red text-white hover:bg-red-hover"
                    : "min-h-11"
                }
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
