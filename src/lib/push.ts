import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { ServiceAccount } from "firebase-admin/app";

// One multicast request carries at most 500 tokens; FCM rejects a larger batch
// outright rather than truncating it.
const CHUNK = 500;

export type PushMessage = {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
  badge?: number;
};

export type PushResult = { sent: number; invalidTokens: string[] };

/**
 * The deploy vault writes `key=value` lines, so a multi-line service-account
 * JSON has to arrive base64-encoded there while `.env.local` may hold the raw
 * file. Both are accepted, told apart by the leading brace.
 */
export function parseServiceAccount(
  raw: string | undefined = process.env.FIREBASE_SERVICE_ACCOUNT,
): ServiceAccount | null {
  const value = raw?.trim();
  if (!value) return null;

  const json = value.startsWith("{")
    ? value
    : Buffer.from(value, "base64").toString("utf8");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64 JSON",
    );
  }

  const projectId = parsed.project_id;
  const clientEmail = parsed.client_email;
  const privateKey = parsed.private_key;
  if (
    typeof projectId !== "string" ||
    typeof clientEmail !== "string" ||
    typeof privateKey !== "string"
  ) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key",
    );
  }

  return { projectId, clientEmail, privateKey };
}

export const isPushConfigured = () => parseServiceAccount() !== null;

const TOKEN_ERROR_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];

/**
 * A token FCM will never accept again, so the row can go. `invalid-argument`
 * covers far more than tokens, hence the message check — deleting a device
 * because a payload field was malformed would lose a working subscription.
 */
export function isInvalidTokenError(err: unknown) {
  const { code, message } = (err ?? {}) as { code?: string; message?: string };
  if (!code) return false;
  if (TOKEN_ERROR_CODES.includes(code)) return true;
  return (
    code === "messaging/invalid-argument" &&
    (message ?? "").toLowerCase().includes("registration token")
  );
}

// Initialised on the first send, never at import: the worker and the Next
// server both load this module, and only one of them ever pushes.
function messaging() {
  const account = parseServiceAccount();
  if (!account) throw new Error("FIREBASE_SERVICE_ACCOUNT is unset");
  return getMessaging(
    getApps()[0] ?? initializeApp({ credential: cert(account) }),
  );
}

export async function sendPush({
  tokens,
  title,
  body,
  data,
  badge,
}: PushMessage): Promise<PushResult> {
  if (tokens.length === 0) return { sent: 0, invalidTokens: [] };

  const invalidTokens: string[] = [];
  const otherErrors: unknown[] = [];
  let sent = 0;

  for (let start = 0; start < tokens.length; start += CHUNK) {
    const batch = tokens.slice(start, start + CHUNK);
    const response = await messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data,
      apns: { payload: { aps: { sound: "default", badge } } },
      android: { priority: "high" },
    });

    response.responses.forEach((result, index) => {
      if (result.success) {
        sent += 1;
        return;
      }
      if (isInvalidTokenError(result.error)) invalidTokens.push(batch[index]);
      else otherErrors.push(result.error ?? new Error("push rejected"));
    });
  }

  // Nothing got through and the reason was not a dead token: let BullMQ retry
  // rather than reporting a delivery that never happened.
  if (sent === 0 && otherErrors.length > 0) throw otherErrors[0];

  return { sent, invalidTokens };
}
