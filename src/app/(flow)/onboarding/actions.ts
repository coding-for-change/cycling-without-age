"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { accounts } from "@/features/accounts";
import { z } from "zod";
import { profile } from "@/features/profile";
import { personalDetailsInput } from "@/features/profile";
import { MAX_MANAGED_RIDERS, managedRiderInput } from "@/features/passengers";
import { readNextPath, requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { readJoinPreset } from "@/lib/join-preset";
import { getLocale } from "@/lib/i18n";
import { canViewStep, type OnboardingStep } from "@/lib/onboarding";
import { acceptOnboardingConsent } from "@/use-cases/accept-onboarding-consent";
import {
  completeCaretakerOnboarding,
  completeOnboardingProfile,
} from "@/use-cases/complete-onboarding-profile";
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

const onward = async (
  session: Parameters<typeof resolveDestination>[0],
): Promise<StepResult> => ({
  ok: true,
  next: await resolveDestination(
    session,
    await readJoinPreset(),
    await readNextPath(),
  ),
});

const consentSchema = z.object({
  safety: z.boolean(),
  notifications: z.boolean(),
  data: z.literal(true),
  health: z.boolean().optional(),
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
      consent: {
        ...parsed.data,
        health:
          at.progress.role === "passenger" &&
          at.account?.managesOthers !== true &&
          parsed.data.health === true,
      },
      preset:
        preset.chapterId && preset.role
          ? { chapterId: preset.chapterId, role: preset.role }
          : null,
    });
    await accounts.claimAccount(at.userId);

    revalidatePath(ONBOARDING);

    return onward(at.session);
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, error: "error" };
  }
}

const relationshipInput = z.enum([
  "child",
  "partner",
  "relative",
  "carer",
  "friend",
  "other",
]);

export async function submitProfile(input: unknown): Promise<StepResult> {
  const at = await atStep("profile");
  if (!at?.progress.role) return { ok: false, error: "generic" };
  if (at.progress.profiled) return onward(at.session);

  const parsed = personalDetailsInput.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error: field === "birthDate" ? "birthDate" : "incomplete",
    };
  }

  try {
    await completeOnboardingProfile({
      userId: at.userId,
      role: at.progress.role,
      details: parsed.data,
      locale: await getLocale(),
    });
    revalidatePath(ONBOARDING);
    return onward(at.session);
  } catch (error) {
    return actionFailure(error, {});
  }
}

const ridersSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  relationship: relationshipInput.optional(),
  riders: z.array(managedRiderInput).min(1).max(MAX_MANAGED_RIDERS),
});

export async function submitRiders(input: unknown): Promise<StepResult> {
  const at = await atStep("profile");
  if (at?.progress.role !== "passenger") return { ok: false, error: "generic" };
  if (at.account?.onboardedAt) return onward(at.session);

  const parsed = ridersSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.at(-1);
    return {
      ok: false,
      error: field === "birthDate" ? "birthDate" : "incomplete",
    };
  }

  try {
    const { firstName, lastName, relationship, riders } = parsed.data;
    await completeCaretakerOnboarding({
      userId: at.userId,
      name: `${firstName} ${lastName}`,
      relationship,
      riders,
      locale: await getLocale(),
    });
    revalidatePath(ONBOARDING);
    return onward(at.session);
  } catch (error) {
    return actionFailure(error, {
      passengerChapterMismatch: "passengerChapterMismatch",
      tooManyRiders: "tooManyRiders",
    });
  }
}

export async function markPasskeyAnswered(): Promise<StepResult> {
  const session = await requireAuth();
  await profile.markPasskeyPrompted(session.user.id);
  revalidatePath(ONBOARDING);
  return onward(session);
}

export async function nextOnboardingPath(): Promise<string> {
  const session = await requireAuth();
  return resolveDestination(
    session,
    await readJoinPreset(),
    await readNextPath(),
  );
}
