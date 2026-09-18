import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { ServiceAccount } from "firebase-admin/app";

const CHUNK = 500;

export type PushMessage = {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
  badge?: number;
  collapseKey?: string;
};

export type PushResult = { sent: number; invalidTokens: string[] };

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

// "invalid-argument" also covers malformed payload fields, hence the message check.
export function isInvalidTokenError(err: unknown) {
  const { code, message } = (err ?? {}) as { code?: string; message?: string };
  if (!code) return false;
  if (TOKEN_ERROR_CODES.includes(code)) return true;
  return (
    code === "messaging/invalid-argument" &&
    (message ?? "").toLowerCase().includes("registration token")
  );
}

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
  collapseKey,
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
      apns: {
        ...(collapseKey
          ? { headers: { "apns-collapse-id": collapseKey } }
          : {}),
        payload: {
          aps: {
            sound: "default",
            badge,
            ...(collapseKey ? { "thread-id": collapseKey } : {}),
          },
        },
      },
      android: {
        priority: "high",
        ...(collapseKey
          ? { collapseKey, notification: { tag: collapseKey } }
          : {}),
      },
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

  if (sent === 0 && otherErrors.length > 0) throw otherErrors[0];

  return { sent, invalidTokens };
}
