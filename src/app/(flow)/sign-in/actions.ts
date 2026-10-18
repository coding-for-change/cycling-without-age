"use server";

import { cookies } from "next/headers";
import {
  SIGN_UP_INTENT_COOKIE,
  SIGN_UP_INTENT_MAX_AGE,
} from "@/lib/sign-up-intent";

/**
 * Records whether the person chose "create account" before their code is
 * sent — the only thing that lets the sign-in endpoints make a new account
 * (`lib/sign-up-intent`). Signing in clears it, so an old choice cannot
 * carry over into a later sign-in on the same device.
 */
export async function setSignUpIntentAction(register: unknown) {
  const jar = await cookies();
  if (register !== true) {
    jar.delete(SIGN_UP_INTENT_COOKIE);
    return;
  }
  jar.set(SIGN_UP_INTENT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SIGN_UP_INTENT_MAX_AGE,
  });
}
