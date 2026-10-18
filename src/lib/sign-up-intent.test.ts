import { mayCreateAccount, SIGN_UP_INTENT_COOKIE } from "@/lib/sign-up-intent";

const at = (path: string, cookies: Record<string, string> = {}) => ({
  path,
  getCookie: (name: string) => cookies[name] ?? null,
});

it("lets an admin, an invite or the seed create accounts", () => {
  expect(mayCreateAccount(at("/admin/create-user"))).toBe(true);
  expect(mayCreateAccount(undefined)).toBe(true);
});

it("creates no account when someone only meant to sign in", () => {
  for (const path of [
    "/sign-in/email-otp",
    "/phone-number/verify",
    "/callback/:id",
    "/sign-in/social",
  ])
    expect(mayCreateAccount(at(path))).toBe(false);
});

it("creates one when they chose to register", () => {
  expect(
    mayCreateAccount(
      at("/sign-in/email-otp", { [SIGN_UP_INTENT_COOKIE]: "1" }),
    ),
  ).toBe(true);
  expect(
    mayCreateAccount(at("/callback/:id", { [SIGN_UP_INTENT_COOKIE]: "1" })),
  ).toBe(true);
});
