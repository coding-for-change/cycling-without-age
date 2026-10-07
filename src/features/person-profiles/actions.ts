"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guards";
import { actionFailure } from "@/lib/domain-error";
import { withinRateLimit } from "@/lib/rate-limit";
import {
  accessPerson,
  canEdit,
  canGiveHealthConsent,
  canRemovePhoto,
  canSetAccessibility,
  canUploadPhoto,
  type PersonTarget,
  type Relation,
} from "@/use-cases/person-access";
import { tickPilotStep } from "@/use-cases/pilot-steps";
import {
  accessibilityInput,
  healthConsentInput,
  personProfiles,
  photoUploadCommit,
  photoUploadRequest,
  pilotStepInput,
  profilePatch,
  subjectRef,
} from "./index";

export type PersonProfileError =
  | "invalid"
  | "generic"
  | "rateLimited"
  | "consentRequired"
  | "uploadRejected"
  | "pilotStepConfirmed";

export type PersonProfileResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: PersonProfileError };

const INVALID = { ok: false, error: "invalid" } as const;
const RATE_LIMITED = { ok: false, error: "rateLimited" } as const;

const SAVE_LIMIT = { max: 60, windowMs: 60_000 };
const UPLOAD_LIMIT = { max: 20, windowMs: 10 * 60_000 };

type Allowed = (relation: Relation, target: PersonTarget) => boolean;

async function authorised(rawSubject: unknown, allowed: Allowed) {
  const subject = subjectRef.safeParse(rawSubject);
  if (!subject.success) return null;
  const session = await requireAuth();
  const found = await accessPerson(session, subject.data);
  if (!found || !allowed(found.relation, found.target)) return null;
  return { session, ...found, subject: found.target.subject };
}

async function attempt<T extends object>(
  run: () => Promise<T>,
): Promise<PersonProfileResult<T>> {
  try {
    const value = await run();
    revalidatePath("/", "layout");
    return { ok: true, ...value };
  } catch (error) {
    return actionFailure(error, {
      healthConsentRequired: "consentRequired",
      uploadRejected: "uploadRejected",
      pilotStepConfirmed: "pilotStepConfirmed",
    });
  }
}

const updateInput = z.object({ subject: z.unknown(), patch: profilePatch });

export async function updatePersonProfileAction(
  input: unknown,
): Promise<PersonProfileResult> {
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canEdit);
  if (!at) return INVALID;
  if (!withinRateLimit(`person-profile:${at.session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;

  return attempt(async () => {
    await personProfiles.updateProfile(at.subject, parsed.data.patch);
    return {};
  });
}

const accessibilityAction = z.object({
  subject: z.unknown(),
  accessibility: accessibilityInput,
});

export async function setAccessibilityAction(
  input: unknown,
): Promise<PersonProfileResult> {
  const parsed = accessibilityAction.safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canSetAccessibility);
  if (!at) return INVALID;
  if (!withinRateLimit(`person-profile:${at.session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;

  return attempt(async () => {
    await personProfiles.setAccessibility(
      at.subject,
      parsed.data.accessibility,
    );
    return {};
  });
}

export async function grantHealthConsentAction(
  input: unknown,
): Promise<PersonProfileResult> {
  const parsed = healthConsentInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canGiveHealthConsent);
  if (!at) return INVALID;
  if (!withinRateLimit(`person-profile:${at.session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;

  return attempt(async () => {
    await personProfiles.grantHealthConsent(at.subject, at.session.user.id);
    return {};
  });
}

export async function withdrawHealthConsentAction(
  input: unknown,
): Promise<PersonProfileResult> {
  const parsed = z.object({ subject: z.unknown() }).safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canGiveHealthConsent);
  if (!at) return INVALID;
  if (!withinRateLimit(`person-profile:${at.session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;

  return attempt(async () => {
    await personProfiles.withdrawHealthConsent(at.subject);
    return {};
  });
}

export async function requestProfilePhotoUploadAction(
  input: unknown,
): Promise<PersonProfileResult<{ key: string; url: string }>> {
  const parsed = photoUploadRequest.safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canUploadPhoto);
  if (!at) return INVALID;
  if (!withinRateLimit(`profile-photo:${at.session.user.id}`, UPLOAD_LIMIT))
    return RATE_LIMITED;

  try {
    const { key, url } = await personProfiles.requestPhotoUpload(
      at.session.user.id,
      parsed.data.mime,
      parsed.data.size,
    );
    return { ok: true, key, url };
  } catch (error) {
    return actionFailure(error, { uploadRejected: "uploadRejected" });
  }
}

export async function commitProfilePhotoAction(
  input: unknown,
): Promise<PersonProfileResult<{ fileId: string }>> {
  const parsed = photoUploadCommit.safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canUploadPhoto);
  if (!at) return INVALID;
  if (!withinRateLimit(`person-profile:${at.session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;
  const onBehalf = at.relation === "manager";
  if (onBehalf && parsed.data.riderAgrees !== true) return INVALID;

  return attempt(async () => ({
    fileId: await personProfiles.setPhoto(at.subject, {
      uploaderUserId: at.session.user.id,
      stagingKey: parsed.data.key,
      agreedByUserId: onBehalf ? at.session.user.id : null,
    }),
  }));
}

export async function removeProfilePhotoAction(
  input: unknown,
): Promise<PersonProfileResult> {
  const parsed = z.object({ subject: z.unknown() }).safeParse(input);
  if (!parsed.success) return INVALID;
  const at = await authorised(parsed.data.subject, canRemovePhoto);
  if (!at) return INVALID;
  if (!withinRateLimit(`person-profile:${at.session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;

  return attempt(async () => {
    await personProfiles.removePhoto(at.subject);
    return {};
  });
}

export async function tickPilotStepAction(
  input: unknown,
): Promise<PersonProfileResult> {
  const parsed = pilotStepInput.safeParse(input);
  if (!parsed.success) return INVALID;
  const session = await requireAuth();
  if (!withinRateLimit(`person-profile:${session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;

  return attempt(async () => {
    await tickPilotStep(session.user.id, parsed.data.step, parsed.data.done);
    return {};
  });
}

export async function dismissSetupAction(): Promise<PersonProfileResult> {
  const session = await requireAuth();
  if (!withinRateLimit(`person-profile:${session.user.id}`, SAVE_LIMIT))
    return RATE_LIMITED;
  return attempt(async () => {
    await personProfiles.dismissSetup(session.user.id);
    return {};
  });
}
