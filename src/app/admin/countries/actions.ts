"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import {
  chapters,
  countryInput,
  countryUpdateInput,
} from "@/features/chapters";
import { requireSuperAdmin } from "@/lib/auth-guards";
import {
  appointCountryAdminByEmail,
  removeCountryAdmin,
} from "@/use-cases/manage-country-admins";

export type CountryActionResult =
  { ok: true } | { ok: false; error: "codeTaken" | "noAccount" | "generic" };

const id = z.string().min(1).max(64);
const appointInput = z.object({ countryId: id, email: z.email() });
const removeInput = z.object({ countryId: id, userId: id });

const duplicate = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const failed = (error: unknown): CountryActionResult =>
  duplicate(error) ||
  (error instanceof Error && error.message.includes("Code already taken"))
    ? { ok: false, error: "codeTaken" }
    : { ok: false, error: "generic" };

export async function createCountryAction(
  input: z.input<typeof countryInput>,
): Promise<CountryActionResult> {
  const parsed = countryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  await requireSuperAdmin();

  try {
    await chapters.createCountry(parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return failed(error);
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
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

export async function appointCountryAdminAction(
  input: z.input<typeof appointInput>,
): Promise<CountryActionResult> {
  const parsed = appointInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireSuperAdmin();

  try {
    const outcome = await appointCountryAdminByEmail({
      email: parsed.data.email,
      countryId: parsed.data.countryId,
      actorUserId: session.user.id,
    });
    if (outcome === "noAccount") return { ok: false, error: "noAccount" };
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    // Appointing someone who already runs the country asks for a state that is
    // already true.
    if (duplicate(error)) return { ok: true };
    return { ok: false, error: "generic" };
  }
}

export async function removeCountryAdminAction(
  input: z.input<typeof removeInput>,
): Promise<CountryActionResult> {
  const parsed = removeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  const session = await requireSuperAdmin();

  try {
    await removeCountryAdmin({
      userId: parsed.data.userId,
      countryId: parsed.data.countryId,
      actorUserId: session.user.id,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}
