"use client";

import { LogOut, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  SettingsGroup,
  SettingsItem,
  SettingsRow,
  SettingsRowButton,
} from "@/components/settings-group";
import {
  finishSignOut,
  forgetDevice,
  useSignOut,
} from "@/components/sign-out-button";
import { deleteOwnAccountAction } from "@/features/accounts/actions";
import type { AccountData } from "./types";

export function DangerSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  const { signOut, pending } = useSignOut();
  const labels = data.strings.danger.delete;

  const remove = async () => {
    await forgetDevice();
    return deleteOwnAccountAction();
  };

  return (
    <div className="grid min-w-0 gap-5">
      <SettingsGroup label={label}>
        <SettingsRow
          icon={LogOut}
          tone="destructive"
          label={data.signOutLabel}
          disabled={pending}
          onClick={signOut}
        />
      </SettingsGroup>
      <SettingsGroup
        footer={
          data.canDeleteAccount ? data.strings.danger.body : labels.blocked
        }
      >
        {data.canDeleteAccount ? (
          <SettingsItem>
            <ConfirmDeleteDialog
              name={data.profile.name}
              labels={labels}
              locale={data.language}
              cancel={data.cancelLabel}
              action={remove}
              onDone={() => void finishSignOut()}
              trigger={
                <SettingsRowButton
                  icon={Trash2}
                  tone="destructive"
                  label={labels.open}
                />
              }
            />
          </SettingsItem>
        ) : (
          <SettingsRow
            icon={Trash2}
            tone="destructive"
            label={labels.open}
            disabled
          />
        )}
      </SettingsGroup>
    </div>
  );
}
