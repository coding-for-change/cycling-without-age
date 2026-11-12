import { activity } from "@/lib/activity";
import {
  appleClientIds,
  appleCredentials,
  type AppleCredentials,
} from "@/lib/apple";
import { DomainError } from "@/lib/domain-error";
import { phoneTempEmail } from "@/lib/identity";
import { NATIVE_APP } from "@/lib/native-app";
import { contact as contactSchema } from "./schemas";
import type { HelperInput } from "./schemas";
import {
  exchangeAppleCode,
  findAppleAccounts,
  revokeAppleToken,
  saveAppleRefreshToken,
} from "./services/apple";
import {
  createAuthUser,
  findProvenance,
  findUserByEmail,
  findUserByPhone,
  findHelperDetails,
  findUserNames,
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

export async function findUserIdByContact(contact: string) {
  const value = contactSchema.parse(contact);
  const existing = value.startsWith("+")
    ? await findUserByPhone(value)
    : await findUserByEmail(value);
  return existing?.id ?? null;
}

export const getHelperDetails = (userId: string) => findHelperDetails(userId);

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

// ponytail: read-then-write, so a double submit could record the event twice;
// an `updateMany({ where: { claimedAt: null } })` in the service closes it.
export async function claimAccount(userId: string) {
  if (!(await getClaimBanner(userId))) return;

  await markUserClaimed(userId);
  await activity.record({
    userId,
    actorUserId: userId,
    type: "accountClaimed",
  });
}

export const deleteUser = (userId: string) => removeUser(userId);

export const displayNames = async (
  ids: string[],
): Promise<Record<string, string>> =>
  ids.length
    ? Object.fromEntries((await findUserNames(ids)).map((u) => [u.id, u.name]))
    : {};

/**
 * Signing in with the native iOS sheet yields only a one-time authorization
 * code. Exchanged for a refresh token, it is what `revokeAppleSignIn` later
 * hands back to Apple when the account is deleted. The website flow needs
 * none of this: better-auth already keeps the refresh token it receives.
 */
export async function keepNativeAppleRefreshToken(
  userId: string,
  authorizationCode: string,
) {
  const linked = await findAppleAccounts(userId);
  if (!appleCredentials || !linked.length) throw new DomainError("notFound");

  const { refreshToken, subject } = await exchangeAppleCode(
    appleCredentials,
    NATIVE_APP.bundleId,
    authorizationCode,
  );
  const account = linked.find(({ accountId }) => accountId === subject);
  if (!account) throw new DomainError("notOwnAccount");

  await saveAppleRefreshToken(account.id, refreshToken);
}

/**
 * The account does not record whether its token came from the website or the
 * app, so both client ids ask Apple; one of them accepting it is enough.
 */
const revokeAtEitherClient = async (
  credentials: AppleCredentials,
  refreshToken: string,
) => {
  const results = await Promise.allSettled(
    appleClientIds(credentials).map((clientId) =>
      revokeAppleToken(credentials, clientId, refreshToken),
    ),
  );
  if (results.some(({ status }) => status === "fulfilled")) return;
  throw (results[0] as PromiseRejectedResult).reason;
};

/** Apple requires apps to revoke a deleted account's tokens. */
export async function revokeAppleSignIn(userId: string) {
  const credentials = appleCredentials;
  if (!credentials) return;

  const refreshTokens = (await findAppleAccounts(userId)).flatMap(
    ({ refreshToken }) => (refreshToken ? [refreshToken] : []),
  );
  await Promise.all(
    refreshTokens.map((token) => revokeAtEitherClient(credentials, token)),
  );
}
