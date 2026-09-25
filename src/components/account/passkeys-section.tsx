"use client";

import { PasskeyManager } from "@/components/passkey-manager";
import type { AccountData } from "./types";

export function PasskeysSection({
  data,
  label,
}: {
  data: AccountData;
  label?: string;
}) {
  return (
    <PasskeyManager
      strings={data.strings.passkeys}
      locale={data.notation}
      label={label}
      footer={data.strings.passkeys.body}
    />
  );
}
