"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { haptics } from "@/lib/native/haptics";
import { formatDate, type Locale } from "@/lib/format";
import { fill } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export type PasskeyManagerStrings = {
  add: string;
  nameLabel: string;
  namePlaceholder: string;
  unnamed: string;
  thisDevice: string;
  synced: string;
  added: string;
  remove: string;
  removeConfirm: string;
  removeBody: string;
  empty: string;
  failed: string;
  signInAgain: string;
  signInAgainAction: string;
  back: string;
};

export function PasskeyManager({
  strings,
  locale,
}: {
  strings: PasskeyManagerStrings;
  locale: Locale;
}) {
  const { data, isPending } = authClient.useListPasskeys();
  const nameId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<"failed" | "stale" | null>(null);
  const [busy, startTransition] = useTransition();

  const passkeys = data ?? [];

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await authClient.passkey.addPasskey({
        name: name.trim() || undefined,
      });
      if (result?.error) {
        haptics.error();
        // Enrolment needs a session younger than a day (BetterAuth freshness)
        // and ours last 90 — signing in again is the whole fix.
        setError(
          "code" in result.error && result.error.code === "SESSION_NOT_FRESH"
            ? "stale"
            : "failed",
        );
        return;
      }
      haptics.success();
      toast.success(strings.added);
      setName("");
      setError(null);
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      haptics.tap();
      const result = await authClient.passkey.deletePasskey({ id });
      setError(result?.error ? "failed" : null);
    });

  const signInAgain = () =>
    startTransition(async () => {
      await authClient.signOut();
      // A full load, like `useSignOut`; `next` brings them back to this screen.
      window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
    });

  return (
    <div className="grid gap-6">
      {isPending && !data ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 rounded-(--r-card)" />
          <Skeleton className="h-16 rounded-(--r-card)" />
        </div>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-ink-soft">{strings.empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-(--r-card) border border-line">
          {passkeys.map((passkey) => {
            const label = passkey.name?.trim() || strings.unnamed;
            return (
              <li
                key={passkey.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-tint"
                >
                  <KeyRound className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium">{label}</span>
                  <span className="text-xs text-ink-soft">
                    {formatDate(passkey.createdAt, locale)}
                  </span>
                </span>
                <Badge
                  variant="outline"
                  className="border-line text-ink-soft"
                >
                  {passkey.deviceType === "multiDevice"
                    ? strings.synced
                    : strings.thisDevice}
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      className="min-h-11 text-ink-soft hover:text-ink"
                    >
                      {strings.remove}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {fill(strings.removeConfirm, { name: label })}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-ink-soft">
                        {strings.removeBody}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="min-h-11 border-line">
                        {strings.back}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => remove(passkey.id)}
                        className="min-h-11 bg-red text-white hover:bg-red-hover"
                      >
                        {strings.remove}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <div
          role="alert"
          className="grid justify-items-start gap-3 rounded-(--r-card) bg-red-tint p-4 text-sm"
        >
          {error === "stale" ? strings.signInAgain : strings.failed}
          {error === "stale" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={signInAgain}
              className="min-h-11 border-line bg-transparent"
            >
              {strings.signInAgainAction}
            </Button>
          )}
        </div>
      )}

      <form
        onSubmit={add}
        aria-busy={busy}
        className="grid gap-3"
      >
        <Field>
          <FieldLabel htmlFor={nameId}>{strings.nameLabel}</FieldLabel>
          <Input
            id={nameId}
            value={name}
            maxLength={64}
            autoComplete="off"
            placeholder={strings.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
            className="h-11 border-line text-base"
          />
        </Field>
        <Button
          type="submit"
          disabled={busy}
          className="min-h-11 justify-self-start bg-red text-white hover:bg-red-hover"
        >
          <KeyRound aria-hidden />
          {strings.add}
        </Button>
      </form>
    </div>
  );
}
