"use server";

import { revalidatePath } from "next/cache";
import {
  invalidateAccess,
  invalidateAdminScopes,
  invalidateReports,
} from "@/lib/cache-tags";
import { actionFailure } from "@/lib/domain-error";
import { z } from "zod";
import {
  chapters,
  countryInput,
  countryUpdateInput,
} from "@/features/chapters";
import {
  admins,
  countryAdminInviteInput,
  inviteId as inviteIdSchema,
} from "@/features/admins";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { getLocale } from "@/lib/i18n";
import { deleteCountry } from "@/use-cases/manage-country";
import { inviteAdmin } from "@/use-cases/invite-admin";

export type CountryActionResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: "codeTaken" | "alreadyAdmin" | "inviteClosed" | "generic";
    };

const id = z.string().min(1).max(64);
const removeInput = z.object({ countryId: id, userId: id });

const failed = (error: unknown) =>
  actionFailure(error, {
    codeTaken: "codeTaken",
    alreadyAdmin: "alreadyAdmin",
    inviteClosed: "inviteClosed",
  });

export async function createCountryAction(
  input: z.input<typeof countryInput>,
): Promise<CountryActionResult> {
  const parsed = countryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  await requireSuperAdmin();

  try {
    const country = await chapters.createCountry(parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true, id: country.id };
  } catch (error) {
    return failed(error);
  } finally {
    invalidateAdminScopes();
  }
}

export async function updateCountryAction(
  countryId: string,
  input: z.input<typeof countryUpdateInput>,
): Promise<CountryActionResult> {
  const parsedId = id.safeParse(countryId);
  const parsed = countryUpdateInput.safeParse(input);
  if (!parsedId.success || !parsed.success)
    return { ok: false, error: "generic" };
  await requireSuperAdmin();

  try {
    await chapters.updateCountry(parsedId.data, parsed.data);
    revalidatePath("/admin", "layout");
    invalidateReports();
    return { ok: true };
  } catch (error) {
    return failed(error);
  } finally {
    invalidateAdminScopes();
  }
}

export async function deleteCountryAction(
  countryId: string,
): Promise<CountryActionResult> {
  const parsedId = id.safeParse(countryId);
  if (!parsedId.success) return { ok: false, error: "generic" };
  const session = await requireSuperAdmin();

  try {
    const { chapterIds } = await deleteCountry({
      countryId: parsedId.data,
      actorUserId: session.user.id,
    });
    revalidatePath("/admin", "layout");
    invalidateReports();
    invalidateAccess({ chapterIds });
    return { ok: true };
  } catch (error) {
    return failed(error);
  } finally {
    invalidateAdminScopes();
    invalidateAccess({ countryIds: [parsedId.data] });
  }
}

export async function inviteCountryAdminAction(
  input: z.input<typeof countryAdminInviteInput>,
): Promise<CountryActionResult> {
  const parsed = countryAdminInviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireSuperAdmin();

  try {
    const { countryId, ...invitee } = parsed.data;
    await inviteAdmin({
      actorUserId: session.user.id,
      locale: await getLocale(),
      invitee,
      target: { kind: "countryAdmin", countryId },
    });
    revalidatePath("/admin/countries");
    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function revokeCountryAdminInviteAction(
  inviteId: string,
): Promise<CountryActionResult> {
  const parsed = inviteIdSchema.safeParse(inviteId);
  if (!parsed.success) return { ok: false, error: "generic" };
  await requireSuperAdmin();

  try {
    await admins.revokeInvite(parsed.data, "countryAdmin");
    revalidatePath("/admin/countries");
    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function removeCountryAdminAction(
  input: z.input<typeof removeInput>,
): Promise<CountryActionResult> {
  const parsed = removeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireSuperAdmin();

  try {
    await chapters.removeCountryAdmin(
      parsed.data.userId,
      parsed.data.countryId,
      session.user.id,
    );
    revalidatePath("/admin", "layout");
    invalidateAccess({ userIds: [parsed.data.userId] });
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}
