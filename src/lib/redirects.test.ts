import { HOME_BY_ROLE, safeNextPath } from "@/lib/redirects";

describe("HOME_BY_ROLE", () => {
  it("routes every role to its home", () => {
    expect(HOME_BY_ROLE.superadmin).toBe("/admin");
    expect(HOME_BY_ROLE.countryAdmin).toBe("/admin");
    expect(HOME_BY_ROLE.chapterAdmin).toBe("/admin");
    expect(HOME_BY_ROLE.pilot).toBe("/pilot");
    expect(HOME_BY_ROLE.passenger).toBe("/passenger");
  });

  it("covers every role, so no session can fall through it", () => {
    expect(Object.keys(HOME_BY_ROLE).sort()).toEqual([
      "chapterAdmin",
      "countryAdmin",
      "passenger",
      "pilot",
      "superadmin",
    ]);
  });
});

describe("safeNextPath", () => {
  it("accepts an absolute in-app path, with query or hash", () => {
    expect(safeNextPath("/pilot")).toBe("/pilot");
    expect(safeNextPath("/admin/rides?chapter=muenchen")).toBe(
      "/admin/rides?chapter=muenchen",
    );
    expect(safeNextPath("/account#passkeys")).toBe("/account#passkeys");
    expect(safeNextPath("/join/muenchen")).toBe("/join/muenchen");
  });

  it("refuses anything that could leave the origin", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("pilot")).toBeNull();
  });

  it("refuses empty, oversized and unprintable values", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(`/${"a".repeat(600)}`)).toBeNull();
    expect(safeNextPath("/pilot\n")).toBeNull();
    expect(safeNextPath("/pilot two")).toBeNull();
  });

  // Without these the wizard would hand itself back its own screens forever.
  it("refuses the screens of the flow it is meant to survive", () => {
    expect(safeNextPath("/sign-in")).toBeNull();
    expect(safeNextPath("/sign-in/code")).toBeNull();
    expect(safeNextPath("/onboarding/consent")).toBeNull();
    expect(safeNextPath("/location")).toBeNull();
    expect(safeNextPath("/welcome")).toBeNull();
    expect(safeNextPath("/api/auth/callback")).toBeNull();
  });

  // Next routes on the decoded pathname, so `/%73ign-in` IS `/sign-in`.
  it("sees through percent-encoding when refusing those screens", () => {
    expect(safeNextPath("/%73ign-in")).toBeNull();
    expect(safeNextPath("/onboarding%2Fconsent")).toBeNull();
    expect(safeNextPath("/%")).toBeNull();
  });

  it("does not confuse a prefix with a path segment", () => {
    expect(safeNextPath("/locations")).toBe("/locations");
  });
});
