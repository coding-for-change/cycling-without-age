"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { profile } from "@/features/profile";
import { personalDetailsInput } from "@/features/profile";
import { requireAuth } from "@/lib/auth-guards";
import { readJoinPreset } from "@/lib/join-preset";
import { getLocale } from "@/lib/i18n";
import { canViewStep, type OnboardingStep } from "@/lib/onboarding";
import { acceptOnboardingConsent } from "@/use-cases/accept-onboarding-consent";
import { completeOnboardingProfile } from "@/use-cases/complete-onboarding-profile";
import {
  getOnboardingState,
  resolveDestination,
} from "@/use-cases/onboarding-progress";


const ONBOARDING = "/onboarding";


export type StepResult =
  { ok: true; next: string } | { ok: false; error: string };


async function atStep(step: OnboardingStep) {
  const session = await requireAuth();
  const state = await getOnboardingState(
    session.user.id,
    await readJoinPreset(),
  );
  if (!canViewStep(state.progress, step)) return null;
  return { session, userId: session.user.id, ...state };
}

/** Recomputed after the write, so it names the step that now comes next. */
const onward = async (
  session: Parameters<typeof resolveDestination>[0],
): Promise<StepResult> => ({
  ok: true,
  next: await resolveDestination(session, await readJoinPreset()),
});

const consentSchema = z.object({
  safety: z.boolean(),
  notifications: z.boolean(),
  data: z.literal(true),
});

export async function submitConsent(input: unknown): Promise<StepResult> {
  
  const at = await atStep("consent");
  if (!at) return { ok: false, error: "error" };

  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "required" };

  if (at.progress.role !== "pilot" && !parsed.data.safety) {
    return { ok: false, error: "required" };
  }

  try {
    const { preset } = at;

    await acceptOnboardingConsent({
      userId: at.userId,
      consent: parsed.data,
      preset:
        preset.chapterId && preset.role
          ? { chapterId: preset.chapterId, role: preset.role }
          : null,
    });

    revalidatePath(ONBOARDING);

    return onward(at.session);
  } catch {
    return { ok: false, error: "error" };
  }
}

/** `null` details is the "booking for someone else" path — see the use case. */
export async function submitProfile(input: unknown): Promise<StepResult> {
  const at = await atStep("profile");
  if (!at?.progress.role) return { ok: false, error: "generic" };

  if (input === null && at.progress.role === "pilot") {
    return { ok: false, error: "incomplete" };
  }

  let details = null;
  if (input !== null) {
    const parsed = personalDetailsInput.safeParse(input);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return {
        ok: false,
        error: field === "birthDate" ? "birthDate" : "incomplete",
      };
    }
    details = parsed.data;
  }

  try {
    await completeOnboardingProfile({
      userId: at.userId,
      role: at.progress.role,
      details,
      locale: await getLocale(),
    });
    revalidatePath(ONBOARDING);
    return onward(at.session);
  } catch {
    return { ok: false, error: "generic" };
  }
}

/** Stamped whichever way they answered, so an optional step is offered once. */
export async function markPasskeyAnswered(): Promise<StepResult> {
  const session = await requireAuth();
  await profile.markPasskeyPrompted(session.user.id);
  revalidatePath(ONBOARDING);
  return onward(session);
}

export async function finishPilotNextSteps(): Promise<StepResult> {
  const session = await requireAuth();
  await profile.markPilotNextStepsSeen(session.user.id);
  revalidatePath(ONBOARDING);
  return onward(session);
}

/** For the location screen, whose join goes through the membership feature's own
 *  action — that slice has no business knowing what onboarding looks like. */
export async function nextOnboardingPath(): Promise<string> {
  const session = await requireAuth();
  return resolveDestination(session, await readJoinPreset());
}
