"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import {
  getOwnRiderNeeds,
  setOwnRiderNeeds,
  type OwnRiderNeeds,
} from "@/use-cases/set-own-rider-needs";
import { riderNeedsInput } from "./schemas";

export type RiderNeedsResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

const SAVE_LIMIT = { max: 60, windowMs: 60_000 };

export async function ownRiderNeedsAction(): Promise<
  { ok: true; rider: OwnRiderNeeds | null } | { ok: false; error: "generic" }
> {
  const session = await requireAuth();
  try {
    return { ok: true, rider: await getOwnRiderNeeds(session.user.id) };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function updateOwnRiderNeedsAction(
  input: unknown,
): Promise<RiderNeedsResult> {
  const session = await requireAuth();
  const parsed = riderNeedsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!withinRateLimit(`rider-needs:${session.user.id}`, SAVE_LIMIT))
    return { ok: false, error: "generic" };

  try {
    await setOwnRiderNeeds(session.user.id, parsed.data);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      unknownLocation: "invalid",
      locationNotInChapter: "invalid",
    } as const);
  }
}
