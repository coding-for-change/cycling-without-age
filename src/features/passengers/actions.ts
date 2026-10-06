"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guards";
import {
  acceptCareRequest,
  declineCareRequest,
} from "@/use-cases/respond-care-request";
import { invalidateReports } from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { addManagedRider as addRider } from "@/use-cases/add-managed-rider";
import {
  removeManagedRider,
  updateManagedRider,
} from "@/use-cases/manage-rider";
import { managedRiderInput, managedRiderPatch } from "./schemas";

export type AddRiderResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "incomplete"
        | "birthDate"
        | "notChapterMember"
        | "tooManyRiders"
        | "generic";
    };

const ADD_LIMIT = { max: 10, windowMs: 60 * 60_000 };

export async function addManagedRider(input: unknown): Promise<AddRiderResult> {
  const session = await requireAuth();
  if (!withinRateLimit(`add-rider:${session.user.id}`, ADD_LIMIT)) {
    return { ok: false, error: "generic" };
  }

  const parsed = managedRiderInput.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error: field === "birthDate" ? "birthDate" : "incomplete",
    };
  }

  try {
    await addRider({ userId: session.user.id, rider: parsed.data });
    revalidatePath("/passenger", "layout");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      notChapterMember: "notChapterMember" as const,
      tooManyRiders: "tooManyRiders" as const,
    });
  }
}

export type ManageRiderResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

const SAVE_LIMIT = { max: 60, windowMs: 60_000 };
const REMOVE_LIMIT = { max: 10, windowMs: 60 * 60_000 };

const passengerId = z.string().min(1).max(64);

const refresh = (chapterId: string | null) => {
  revalidatePath("/passenger", "layout");
  revalidatePath("/admin/passengers", "layout");
  if (chapterId) invalidateReports(chapterId);
};

export async function updateManagedRiderAction(
  id: unknown,
  patch: unknown,
): Promise<ManageRiderResult> {
  const session = await requireAuth();
  const parsedId = passengerId.safeParse(id);
  const parsed = managedRiderPatch.safeParse(patch);
  if (!parsedId.success || !parsed.success)
    return { ok: false, error: "invalid" };
  if (!withinRateLimit(`manage-rider:${session.user.id}`, SAVE_LIMIT))
    return { ok: false, error: "generic" };

  try {
    const { chapterId } = await updateManagedRider({
      viewer: session,
      passengerId: parsedId.data,
      patch: parsed.data,
    });
    refresh(chapterId);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function removeManagedRiderAction(
  id: unknown,
): Promise<ManageRiderResult> {
  const session = await requireAuth();
  const parsedId = passengerId.safeParse(id);
  if (!parsedId.success) return { ok: false, error: "invalid" };
  if (!withinRateLimit(`remove-rider:${session.user.id}`, REMOVE_LIMIT))
    return { ok: false, error: "generic" };

  try {
    const { chapterId } = await removeManagedRider({
      viewer: session,
      passengerId: parsedId.data,
    });
    refresh(chapterId);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export type CareAnswerResult =
  | { ok: true }
  | {
      ok: false;
      error: "passengerChapterMismatch" | "tooManyRiders" | "generic";
    };

const careRequestId = z.string().min(1).max(64);
const ANSWER_LIMIT = { max: 20, windowMs: 60 * 60_000 };

async function answer(
  input: unknown,
  run: (args: { userId: string; requestId: string }) => Promise<unknown>,
): Promise<CareAnswerResult> {
  const session = await requireAuth();
  if (!withinRateLimit(`care-answer:${session.user.id}`, ANSWER_LIMIT))
    return { ok: false, error: "generic" };
  const parsed = careRequestId.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };

  try {
    await run({ userId: session.user.id, requestId: parsed.data });
    revalidatePath(`/care/${parsed.data}`);
    revalidatePath("/passenger", "layout");
    revalidatePath("/admin/passengers");
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      passengerChapterMismatch: "passengerChapterMismatch" as const,
      tooManyRiders: "tooManyRiders" as const,
    });
  }
}

export const acceptCareRequestAction = async (input: unknown) =>
  answer(input, acceptCareRequest);

export const declineCareRequestAction = async (input: unknown) =>
  answer(input, declineCareRequest);
