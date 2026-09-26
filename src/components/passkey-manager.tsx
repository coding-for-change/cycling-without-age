"use client";

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { addPasskey } from "@/lib/passkey-client";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SettingsGroup,
  SettingsItem,
  SettingsRowButton,
} from "@/components/settings-group";

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
  label,
  footer,
}: {
  strings: PasskeyManagerStrings;
  locale: Locale;
  label?: string;
  footer?: ReactNode;
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
      const result = await addPasskey({ name: name.trim() || undefined });
      if (result.error) {
        haptics.error();
        // Enrolment needs a session younger than a day (BetterAuth freshness)
        // and ours last 90 — signing in again is the whole fix.
        setError(
          result.error.code === "SESSION_NOT_FRESH" ? "stale" : "failed",
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
      window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
    });

  return (
    <form
      onSubmit={add}
      aria-busy={busy}
      className="grid min-w-0 gap-5"
    >
      <SettingsGroup
        label={label}
        footer={footer}
      >
        {isPending && !data ? (
          <>
            <SettingsItem>
              <Skeleton className="h-5 w-40" />
            </SettingsItem>
            <SettingsItem>
              <Skeleton className="h-5 w-32" />
            </SettingsItem>
          </>
        ) : passkeys.length === 0 ? (
          <SettingsItem className="py-3 text-sm text-ink-soft">
            {strings.empty}
          </SettingsItem>
        ) : (
          passkeys.map((passkey) => {
            const name = passkey.name?.trim() || strings.unnamed;
            return (
              <SettingsItem
                key={passkey.id}
                className="py-2"
              >
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-mint-tint"
                >
                  <KeyRound className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="truncate text-2sm text-ink-soft">
                    {formatDate(passkey.createdAt, locale)} ·{" "}
                    {passkey.deviceType === "multiDevice"
                      ? strings.synced
                      : strings.thisDevice}
                  </span>
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={busy}
                      className="-mr-2 min-h-11 shrink-0 rounded-(--r-card) px-2 text-sm font-medium text-red transition-colors hover:text-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
                    >
                      {strings.remove}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {fill(strings.removeConfirm, { name })}
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
                        variant="brand"
                        onClick={() => remove(passkey.id)}
                        className="min-h-11"
                      >
                        {strings.remove}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SettingsItem>
            );
          })
        )}
        <SettingsItem className="focus-within:bg-canvas-deep">
          <Input
            id={nameId}
            value={name}
            maxLength={64}
            autoComplete="off"
            aria-label={strings.nameLabel}
            placeholder={strings.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </SettingsItem>
        <SettingsItem>
          <SettingsRowButton
            type="submit"
            icon={Plus}
            tone="action"
            label={strings.add}
            disabled={busy}
          />
        </SettingsItem>
      </SettingsGroup>

      {error && (
        <div
          role="alert"
          className="grid justify-items-start gap-3 rounded-(--r-card) bg-red-tint p-4 text-sm"
        >
          {error === "stale" ? strings.signInAgain : strings.failed}
          {error === "stale" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={signInAgain}
              className="min-h-11 rounded-full border-line bg-transparent"
            >
              {strings.signInAgainAction}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
