"use server";

import { revalidatePath } from "next/cache";
import { requireChapterAdmin } from "@/lib/auth-guards";
import { getLocale } from "@/lib/i18n";
import { inviteChapterUser as invite } from "@/use-cases/invite-chapter-user";
import { provisionAssistedPassenger } from "@/use-cases/provision-assisted-passenger";
import { assistedPassengerInput, inviteInput } from "./schemas";

export type AccountActionResult =
  { ok: true } | { ok: false; error: "exists" | "invalid" | "generic" };

export type InviteActionResult =
  { ok: true; created: boolean } | { ok: false; error: "invalid" | "generic" };

export async function addAssistedPassenger(
  input: unknown,
): Promise<AccountActionResult> {
  const parsed = assistedPassengerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireChapterAdmin(parsed.data.chapterId);

  try {
    await provisionAssistedPassenger({
      adminUserId: session.user.id,
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Already has an account"))
      return { ok: false, error: "exists" };
    return { ok: false, error: "generic" };
  }
}

export async function inviteChapterUser(
  input: unknown,
): Promise<InviteActionResult> {
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const session = await requireChapterAdmin(parsed.data.chapterId);

  try {
    const { created } = await invite({
      inviterUserId: session.user.id,
      inviterName: session.user.name,
      locale: await getLocale(),
      input: parsed.data,
    });
    revalidatePath("/admin", "layout");
    return { ok: true, created };
  } catch {
    return { ok: false, error: "generic" };
  }
}
