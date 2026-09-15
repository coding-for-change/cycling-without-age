"use client";

import { ToggleRow } from "@/components/settings-rows";
import { setNotificationPreferencesAction } from "@/features/profile/actions";
import { isNative, requestNotificationPermission } from "@/lib/native/push";
import type { ActionResult } from "@/components/action-feedback";
import type { AccountData } from "./types";

export function NotificationsSection({ data }: { data: AccountData }) {
  const strings = data.strings;

  const pushLabels = {
    ...strings.field,
    errors: {
      ...strings.field.errors,
      permissionDenied: strings.notifications.permissionDenied,
    },
  };

  const savePush = async (next: boolean): Promise<ActionResult> => {
    if (next && isNative() && !(await requestNotificationPermission()))
      return { ok: false, error: "permissionDenied" };
    return setNotificationPreferencesAction({ push: next });
  };

  return (
    <div className="grid gap-3">
      <p className="max-w-prose text-sm text-ink-soft">
        {strings.notifications.body}
      </p>
      <ul className="grid divide-y divide-line">
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
      </ul>
    </div>
  );
}
