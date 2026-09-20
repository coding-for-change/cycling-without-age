import { isAppPath } from "./app-path";

describe("isAppPath", () => {
  it.each(["/pilot", "/admin/members/abc", "/sign-in?next=%2Fadmin", "/a#b"])(
    "accepts %s",
    (href) => expect(isAppPath(href)).toBe(true),
  );

  it.each([
    "",
    "/",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example/pilot",
    "javascript:alert(1)",
    "pilot",
    `/${"a".repeat(600)}`,
    42,
    null,
  ])("refuses %p", (href) => expect(isAppPath(href)).toBe(false));
});
