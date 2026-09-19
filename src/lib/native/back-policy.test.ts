import { decideBack } from "./back-policy";

const context = (overrides: Partial<Parameters<typeof decideBack>[0]> = {}) => ({
  overlayOpen: false,
  depth: 0,
  pathname: "/pilot",
  ...overrides,
});

describe("decideBack", () => {
  it("closes an open overlay before anything else", () => {
    expect(
      decideBack(context({ overlayOpen: true, depth: 3, pathname: "/pilot/rides" })),
    ).toBe("close-overlay");
  });

  it.each([1, 4])("steps back while history has depth %p", (depth) => {
    expect(decideBack(context({ depth, pathname: "/pilot/chat" }))).toBe("back");
  });

  it.each([
    ["/pilot/rides", "/pilot"],
    ["/pilot/training", "/pilot"],
    ["/passenger/calendar", "/passenger"],
  ])("replaces %s with its perspective home", (pathname, href) => {
    expect(decideBack(context({ pathname }))).toEqual({ kind: "replace", href });
  });

  it.each(["/pilot", "/passenger", "/admin/chapters", "/", "/pilotage"])(
    "minimizes on %s with nothing behind it",
    (pathname) => {
      expect(decideBack(context({ pathname }))).toBe("minimize");
    },
  );
});
