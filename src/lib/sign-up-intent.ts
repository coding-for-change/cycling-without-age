/**
 * Signing in and registering share one code flow, so the sign-in endpoints can
 * create an account. They may only when the person chose "create account":
 * that choice travels as a short-lived cookie. Accounts made on the server —
 * an admin, an invite, the seed — never pass these paths and are not touched.
 *
 * Not a security boundary — registration is open — but it keeps a typo on the
 * sign-in screen from quietly becoming a second account.
 */
export const SIGN_UP_INTENT_COOKIE = "cwa_sign_up";
export const SIGN_UP_INTENT_MAX_AGE = 15 * 60;

/** Where better-auth creates an account as a side effect of signing in. */
const SIGN_IN_PATHS = new Set([
  "/sign-in/email-otp",
  "/phone-number/verify",
  "/callback/:id",
  "/sign-in/social",
]);

/** The reason a refused sign-in reports, read by the code step. */
export const NO_ACCOUNT = "NO_ACCOUNT";

export const mayCreateAccount = (
  ctx:
    | { path?: string; getCookie?: (name: string) => string | null }
    | null
    | undefined,
) =>
  !ctx?.path ||
  !SIGN_IN_PATHS.has(ctx.path) ||
  Boolean(ctx.getCookie?.(SIGN_UP_INTENT_COOKIE));
