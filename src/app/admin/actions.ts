"use server";

import { cookies } from "next/headers";
import { resolveActiveScope } from "@/lib/access";
import { requireAdminScope } from "@/lib/auth-guards";
import {
  ADMIN_SCOPE_COOKIE,
  ADMIN_SCOPE_MAX_AGE,
  scopeArgOf,
  scopeArgParams,
} from "./scope-cookie";

export async function setAdminScope(arg: string) {
  const { scope } = await requireAdminScope();

  const params = scopeArgParams(arg);
  if (arg !== "all" && !params.chapter && !params.country) return;

  const active = resolveActiveScope(scope, params);
  if (!active) return;

  (await cookies()).set(ADMIN_SCOPE_COOKIE, scopeArgOf(active), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: ADMIN_SCOPE_MAX_AGE,
  });
}
