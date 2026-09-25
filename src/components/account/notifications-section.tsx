"use client";

import { SettingsGroup } from "@/components/settings-group";
import { ToggleRow } from "@/components/settings-rows";
import { setNotificationPreferencesAction } from "@/features/profile/actions";
import { isNative, requestNotificationPermission } from "@/lib/native/push";
import type { ActionResult } from "@/components/action-feedback";
import type { AccountData } from "./types";

export function NotificationsSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  const strings = data.strings;

  const pushLabels = {
    ...strings.field,
    errors: {
      ...strings.field.errors,
      permissionDenied: strings.notifications.permissionDenied,
    },
  };

  const permitted = async () =>
    !isNative() || (await requestNotificationPermission());

  const savePush = async (next: boolean): Promise<ActionResult> => {
    if (next && !(await permitted()))
      return { ok: false, error: "permissionDenied" };
    return setNotificationPreferencesAction({ push: next });
  };

  const saveChatPush = async (next: boolean): Promise<ActionResult> => {
    if (next && !(await permitted()))
      return { ok: false, error: "permissionDenied" };
    return setNotificationPreferencesAction({ chatPush: next });
  };

  return (
    <SettingsGroup
      label={label}
      footer={strings.notifications.body}
    >
      <ToggleRow
        value={data.notifications.push}
        label={strings.notifications.push.label}
        hint={strings.notifications.push.hint}
        labels={pushLabels}
        onSave={savePush}
      />
      <ToggleRow
        value={data.notifications.email}
        label={strings.notifications.email.label}
        hint={strings.notifications.email.hint}
        labels={strings.field}
        onSave={(next) => setNotificationPreferencesAction({ email: next })}
      />
      <ToggleRow
        value={data.notifications.chatPush}
        label={strings.notifications.chat.push.label}
        hint={strings.notifications.chat.push.hint}
        labels={pushLabels}
        onSave={saveChatPush}
      />
      <ToggleRow
        value={data.notifications.chatEmail}
        label={strings.notifications.chat.email.label}
        hint={strings.notifications.chat.email.hint}
        labels={strings.field}
        onSave={(next) => setNotificationPreferencesAction({ chatEmail: next })}
      />
    </SettingsGroup>
  );
}
