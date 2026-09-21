"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { profile } from "@/features/profile";
import { getSession } from "@/lib/auth-guards";
import { hasLocale, LOCALE_COOKIE } from "@/lib/i18n";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocale(locale: string) {
  if (!hasLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });

  const session = await getSession();
  if (session) {
    try {
      await profile.setLocale(session.user.id, locale);
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  revalidatePath("/", "layout");
}
