import type { Perspective } from "@/lib/access";
import { AccountSurfaceHost } from "./account-surface-host";
import { loadAccount } from "./load-account";

export async function AccountPanel({
  activePerspective,
}: {
  activePerspective: Perspective;
}) {
  const account = await loadAccount();
  if (!account) return null;

  return (
    <AccountSurfaceHost
      data={account}
      activePerspective={activePerspective}
    />
  );
}
