export type AuthEventKind =
  | "otp_email_sent"
  | "otp_phone_sent"
  | "sign_in"
  | "passkey_added"
  | "sign_out"
  | "user_created"
  | "other";

const BY_PATH: Record<string, AuthEventKind> = {
  "/email-otp/send-verification-otp": "otp_email_sent",
  "/phone-number/send-otp": "otp_phone_sent",
  "/sign-in/email-otp": "sign_in",
  "/phone-number/verify": "sign_in",
  "/passkey/verify-authentication": "sign_in",
  "/passkey/verify-registration": "passkey_added",
  "/sign-out": "sign_out",
};

export function authEventKind(path: string | null | undefined): AuthEventKind {
  if (!path) return "other";
  return BY_PATH[path] ?? (path.startsWith("/callback/") ? "sign_in" : "other");
}
