"use client";

import { useState } from "react";
import type { Perspective } from "@/lib/access";
import {
  closeAccount,
  closeLegalDocument,
  openAccount,
  useAccountView,
  type AccountView,
} from "./account-state";
import { AccountSurface } from "./account-surface";
import type { AccountData } from "./types";

const INITIAL_VIEW: AccountView = { section: "profile", legalDocument: null };

export function AccountSurfaceHost({
  data,
  activePerspective,
}: {
  data: AccountData;
  activePerspective: Perspective;
}) {
  const view = useAccountView();
  const [shown, setShown] = useState<AccountView>(INITIAL_VIEW);
  if (view !== null && view !== shown) setShown(view);

  return (
    <AccountSurface
      data={data}
      activePerspective={activePerspective}
      open={view !== null}
      onOpenChange={(open) => {
        if (!open) closeAccount();
      }}
      section={shown.section}
      onSectionChange={openAccount}
      legalDocument={shown.legalDocument}
      onCloseLegalDocument={closeLegalDocument}
    />
  );
}
