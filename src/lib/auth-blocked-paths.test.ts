import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isBlockedOverHttp } from "./auth-blocked-paths";

const ADMIN_ENDPOINTS = [
  "/admin/set-role",
  "/admin/create-user",
  "/admin/remove-user",
  "/admin/ban-user",
  "/admin/impersonate-user",
  "/admin/stop-impersonating",
  "/admin/list-users",
  "/admin/set-user-password",
  "/admin/revoke-user-sessions",
];

describe("better-auth's admin endpoints", () => {
  it.each(ADMIN_ENDPOINTS)("refuses %s over HTTP", (path) => {
    expect(isBlockedOverHttp(path, true)).toBe(true);
  });

  it("still lets the server provision accounts through auth.api", () => {
    expect(isBlockedOverHttp("/admin/create-user", false)).toBe(false);
  });

  it.each([
    "/passkey/verify-authentication",
    "/sign-in/email-otp",
    "/get-session",
    "/organization/list",
  ])("leaves %s alone", (path) => {
    expect(isBlockedOverHttp(path, true)).toBe(false);
  });

  it("is wired into the before hook of lib/auth", () => {
    const source = readFileSync(join(__dirname, "auth.ts"), "utf8");
    expect(source).toMatch(
      /before:\s*createAuthMiddleware\(async \(ctx\) => \{\s*if \(isBlockedOverHttp\(ctx\.path, Boolean\(ctx\.request\)\)\)/,
    );
  });
});
