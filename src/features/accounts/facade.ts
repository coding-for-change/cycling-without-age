import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { phoneTempEmail } from "@/lib/identity";
import { contact as contactSchema } from "./schemas";
import type { HelperInput } from "./schemas";
import {
  createAuthUser,
  findProvenance,
  findUserByEmail,
  findUserByPhone,
  markClaimed as markUserClaimed,
  removeUser,
  setProvenance,
} from "./services/users";

export type ProvisionInput = {
  name: string;
  contact: string;
  createdByUserId: string;
  helper?: HelperInput;
  managesOthers?: boolean;
};

export async function provisionUser({
  name,
  contact,
  createdByUserId,
  helper,
  managesOthers = false,
}: ProvisionInput) {
  const value = contactSchema.parse(contact);
  const byPhone = value.startsWith("+");

  const existing = byPhone
    ? await findUserByPhone(value)
    : await findUserByEmail(value);
  if (existing) return { userId: existing.id, created: false };

  const userId = await createAuthUser({
    email: byPhone ? phoneTempEmail(value) : value,
    name: name.trim(),
    ...(byPhone ? { phoneNumber: value } : {}),
  });
  await setProvenance(userId, {
    createdByUserId,
    ...(helper
      ? {
          helperName: helper.name,
          helperRelationship: helper.relationship,
          helperContact: helper.contact,
        }
      : {}),
    ...(managesOthers ? { managesOthers: true } : {}),
  });
  return { userId, created: true };
}

export async function provisionUserStrict(input: ProvisionInput) {
  const result = await provisionUser(input);
  if (!result.created) throw new DomainError("alreadyHasAccount");
  return result;
}

export async function getClaimBanner(userId: string) {
  const row = await findProvenance(userId);
  return row?.claimedAt ? null : (row?.createdBy?.name ?? null);
}

export const markClaimed = (userId: string) => markUserClaimed(userId);

/**
 * Someone signing in to an account an admin created for them takes it over.
 * ponytail: read-then-write, so a double submit could record the event twice;
 * an `updateMany({ where: { claimedAt: null } })` in the service closes it.
 */
export async function claimAccount(userId: string) {
  if (!(await getClaimBanner(userId))) return;

  await markUserClaimed(userId);
  await activity.record({
    userId,
    actorUserId: userId,
    type: "accountClaimed",
  });
}

/** Hard delete. Sessions, passkeys, memberships, applications and history cascade
 *  in the schema; rows that only point at this person (`createdBy`, event actor)
 *  are nulled there too. */
export const deleteUser = (userId: string) => removeUser(userId);
