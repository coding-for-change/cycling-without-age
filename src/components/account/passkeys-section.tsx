"use client";

import { PasskeyManager } from "@/components/passkey-manager";
import type { AccountData } from "./types";

export function PasskeysSection({ data }: { data: AccountData }) {
  return (
    <div className="grid gap-4">
      <p className="max-w-prose text-sm text-ink-soft">
        {data.strings.passkeys.body}
      </p>
      <PasskeyManager
        strings={data.strings.passkeys}
        locale={data.notation}
      />
    </div>
  );
}
