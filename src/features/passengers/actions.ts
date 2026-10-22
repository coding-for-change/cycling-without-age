"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requireAdminScope,
  requireAuth,
  requireChapterAdmin,
} from "@/lib/auth-guards";
import {
  acceptCareRequest,
  declineCareRequest,
} from "@/use-cases/respond-care-request";
import { invalidateAccess, invalidateReports } from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import { addManagedRider as addRider } from "@/use-cases/add-managed-rider";
import { handOverRider } from "@/use-cases/hand-over-rider";
import { requestCarerLink } from "@/use-cases/link-carer";
import {
  removeManagedRider,
  updateManagedRider,
} from "@/use-cases/manage-rider";
import { passengers } from "./index";
import type { OwnRiderNeeds } from "./facade";
import { contact } from "@/features/accounts/schemas";
import {
  carerLinkInput,
  managedRiderPatch,
  newManagedRiderInput,
  riderNeedsInput,
} from "./schemas";

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

  const parsed = newManagedRiderInput.safeParse(input);
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
  answer(input, async (args) => {
    const { riderUserId } = await acceptCareRequest(args);
    invalidateAccess({
      userIds: riderUserId ? [args.userId, riderUserId] : [args.userId],
    });
    if (riderUserId) revalidatePath(`/admin/members/${riderUserId}`);
  });

export const declineCareRequestAction = async (input: unknown) =>
  answer(input, declineCareRequest);

export type RiderNeedsResult =
  { ok: true } | { ok: false; error: "invalid" | "generic" };

export async function ownRiderNeedsAction(): Promise<
  { ok: true; rider: OwnRiderNeeds | null } | { ok: false; error: "generic" }
> {
  const session = await requireAuth();
  try {
    return {
      ok: true,
      rider: await passengers.getOwnRiderNeeds(session.user.id),
    };
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
    await passengers.setOwnRiderNeeds(session.user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export async function updateManagedRiderNeedsAction(
  id: unknown,
  input: unknown,
): Promise<RiderNeedsResult> {
  const session = await requireAuth();
  const parsedId = passengerId.safeParse(id);
  const parsed = riderNeedsInput.safeParse(input);
  if (!parsedId.success || !parsed.success)
    return { ok: false, error: "invalid" };
  if (!withinRateLimit(`rider-needs:${session.user.id}`, SAVE_LIMIT))
    return { ok: false, error: "generic" };

  try {
    const { chapterId } = await passengers.setManagedRiderNeeds(
      parsedId.data,
      session.user.id,
      parsed.data,
    );
    refresh(chapterId);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {});
  }
}

export type HandOverResult =
  | { ok: true; invited: boolean }
  | {
      ok: false;
      error:
        | "notChapterMember"
        | "sameManager"
        | "passengerChapterMismatch"
        | "tooManyRiders"
        | "unknownPassenger"
        | "rateLimited"
        | "generic";
    };

const HAND_OVER_LIMIT = { max: 20, windowMs: 60 * 60_000 };

const handOverInput = z.object({
  passengerId,
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("member"), userId: passengerId }),
    z.object({
      kind: z.literal("invite"),
      name: z.string().trim().min(1).max(120),
      contact,
    }),
  ]),
});

/**
 * An admin of the rider's own chapter — read from the rider, never from the
 * client — moves the rider to another account.
 */
export async function handOverRiderAction(
  input: unknown,
): Promise<HandOverResult> {
  const parsed = handOverInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  await requireAdminScope();
  const rider = await passengers.getPassenger(parsed.data.passengerId);
  if (!rider || rider.userId) return { ok: false, error: "unknownPassenger" };
  const { user } = await requireChapterAdmin(rider.chapterId);
  if (!withinRateLimit(`hand-over:${user.id}`, HAND_OVER_LIMIT))
    return { ok: false, error: "rateLimited" };

  try {
    const moved = await handOverRider({
      passengerId: rider.id,
      target: parsed.data.target,
      actorUserId: user.id,
    });
    invalidateAccess({ userIds: [moved.toUserId, moved.fromUserId] });
    refresh(moved.chapterId);
    revalidatePath("/admin/members", "layout");
    return { ok: true, invited: moved.invited };
  } catch (error) {
    return actionFailure(error, {
      notChapterMember: "notChapterMember",
      sameManager: "sameManager",
      passengerChapterMismatch: "passengerChapterMismatch",
      tooManyRiders: "tooManyRiders",
      unknownPassenger: "unknownPassenger",
    } as const);
  }
}

export type CarerLinkResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "notChapterMember"
        | "sameManager"
        | "passengerChapterMismatch"
        | "tooManyRiders"
        | "unknownPassenger"
        | "rateLimited"
        | "generic";
    };

const LINK_LIMIT = { max: 20, windowMs: 60 * 60_000 };

export async function requestCarerLinkAction(
  input: unknown,
): Promise<CarerLinkResult> {
  const parsed = carerLinkInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  await requireAdminScope();
  const rider = await passengers.getPassenger(parsed.data.passengerId);
  if (!rider?.userId) return { ok: false, error: "unknownPassenger" };
  const { user } = await requireChapterAdmin(rider.chapterId);
  if (!withinRateLimit(`carer-link:${user.id}`, LINK_LIMIT))
    return { ok: false, error: "rateLimited" };

  try {
    const linked = await requestCarerLink({
      passengerId: rider.id,
      caretakerUserId: parsed.data.caretakerUserId,
      actorUserId: user.id,
    });
    revalidatePath(`/admin/members/${linked.riderUserId}`);
    return { ok: true };
  } catch (error) {
    return actionFailure(error, {
      notChapterMember: "notChapterMember",
      sameManager: "sameManager",
      passengerChapterMismatch: "passengerChapterMismatch",
      tooManyRiders: "tooManyRiders",
      unknownPassenger: "unknownPassenger",
    } as const);
  }
}
