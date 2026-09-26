"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rides } from "@/features/rides";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { allocateTrishaws } from "@/use-cases/schedule-ride";

export type AllocationResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "trishawReserved"
        | "trishawUnavailable"
        | "trishawNotInChapter"
        | "generic";
    };

const allocationInput = z.object({
  rideId: z.string().min(1).max(64),
  trishawIds: z.array(z.string().min(1).max(64)).max(20),
});

export async function allocateTrishawsAction(
  input: unknown,
): Promise<AllocationResult> {
  const parsed = allocationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const ride = await rides.getRide(parsed.data.rideId);
  if (!ride) return { ok: false, error: "generic" };
  await requireChapterAdmin(ride.chapterId);

  try {
    await allocateTrishaws(parsed.data.rideId, parsed.data.trishawIds);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      trishawReserved: "trishawReserved",
      trishawUnavailable: "trishawUnavailable",
      trishawNotInChapter: "trishawNotInChapter",
    });
  }
}
