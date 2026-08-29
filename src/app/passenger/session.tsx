"use client";

/* Passenger session context — who is signed in (Maria by default). Provided by
   the shell only when a session exists, so pages can rely on it. */

import { createContext, useContext } from "react";
import type { Session } from "@/lib/auth";

export const PassengerCtx = createContext<Session | null>(null);

export function usePassenger(): Session {
  const s = useContext(PassengerCtx);
  if (!s) throw new Error("usePassenger outside PassengerShell");
  return s;
}

export const PAX_DEMO_PHONE = "+49 89 555 2211";
export const PAX_DEMO_CODE = "4 7 2 9 1 3";
export const WA_KEY = "cwa.waSuggested";
export const NOTIF_KEY = "cwa.pax.notifs";
