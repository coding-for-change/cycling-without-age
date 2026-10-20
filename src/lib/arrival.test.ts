import { arrivedFromApp } from "./arrival";

const ORIGIN = "https://cwa.example";

const arrival = (
  overrides: Partial<Parameters<typeof arrivedFromApp>[0]> = {},
) => ({
  origin: ORIGIN,
  currentPath: "/legal/privacy",
  landingUrl: `${ORIGIN}/legal/privacy`,
  referrer: "",
  historyLength: 2,
  ...overrides,
});

describe("arrivedFromApp", () => {
  it("is true after navigating here inside the app", () => {
    expect(arrivedFromApp(arrival({ landingUrl: `${ORIGIN}/sign-in` }))).toBe(
      true,
    );
  });

  it("is true when another page of the app loaded this one", () => {
    expect(arrivedFromApp(arrival({ referrer: `${ORIGIN}/legal/terms` }))).toBe(
      true,
    );
  });

  it.each([
    ["opened directly", ""],
    ["came from another site", "https://www.google.com/"],
    ["has an unreadable referrer", "not a url"],
  ])("is false when the page was %s", (_, referrer) => {
    expect(arrivedFromApp(arrival({ referrer }))).toBe(false);
  });

  it("is false in a new tab opened from the app, which has nothing to go back to", () => {
    expect(
      arrivedFromApp(
        arrival({ referrer: `${ORIGIN}/sign-in`, historyLength: 1 }),
      ),
    ).toBe(false);
  });

  it("is false when the landing page is unknown", () => {
    expect(arrivedFromApp(arrival({ landingUrl: null }))).toBe(false);
  });

  it("ignores the query string of the landing page", () => {
    expect(
      arrivedFromApp(
        arrival({ landingUrl: `${ORIGIN}/legal/privacy?lang=da` }),
      ),
    ).toBe(false);
  });
});
