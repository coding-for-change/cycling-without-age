"use client";

import { LogOut, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  finishSignOut,
  forgetDevice,
  useSignOut,
} from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { deleteOwnAccountAction } from "@/features/accounts/actions";
import type { AccountData } from "./types";

const DELETE_TRIGGER =
  "min-h-11 justify-start border-line text-2sm text-red hover:bg-red-tint hover:text-red";

export function DangerSection({ data }: { data: AccountData }) {
  const { signOut, pending } = useSignOut();
  const labels = data.strings.danger.delete;

  /**
   * The push token has to go while the session that authorises unregistering it
   * is still there, so it goes first; the sign-out at the end only has a cookie
   * left to clear.
   */
  const remove = async () => {
    await forgetDevice();
    return deleteOwnAccountAction();
  };

  return (
    <div className="grid justify-items-start gap-3">
      <p className="max-w-prose text-sm text-ink-soft">
        {data.strings.danger.body}
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={signOut}
        className="min-h-11 gap-2 rounded-full border-line"
      >
        <LogOut
          aria-hidden
          className="size-4"
        />
        {data.signOutLabel}
      </Button>
      {data.canDeleteAccount ? (
        <ConfirmDeleteDialog
          name={data.profile.name}
          labels={labels}
          cancel={data.cancelLabel}
          errors={labels.errors}
          action={remove}
          onDone={() => void finishSignOut()}
          trigger={
            <Button
              variant="outline"
              className={DELETE_TRIGGER}
            >
              <Trash2 aria-hidden />
              {labels.open}
            </Button>
          }
        />
      ) : (
        <>
          <Button
            variant="outline"
            disabled
            className={DELETE_TRIGGER}
          >
            <Trash2 aria-hidden />
            {labels.open}
          </Button>
          <p className="max-w-prose text-2sm text-ink-soft">{labels.blocked}</p>
        </>
      )}
    </div>
  );
}
