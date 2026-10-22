import {
  placeLine,
  requestedRoute,
  requestedWhen,
  routeLine,
  routeWay,
} from "./request-words";

const words = { to: "{from} to {to}", toAndBack: "{from} to {to} and back" };

describe("the route of a request", () => {
  it("names both ends and the way back in the reader's words", () => {
    expect(
      routeWay({ from: "Home", to: "Dr. Weber", back: true }, words, "en"),
    ).toBe("Home to Dr. Weber and back");
    expect(routeWay({ from: "Home", to: "Dr. Weber" }, words, "en")).toBe(
      "Home to Dr. Weber",
    );
  });

  it("names the one place a ride out starts from", () => {
    expect(routeWay({ from: "Sonnenhof", to: null }, words, "en")).toBe(
      "Sonnenhof",
    );
    expect(routeLine("Ride out", { from: null, to: null }, words, "en")).toBe(
      "Ride out",
    );
  });

  it("puts the model in front", () => {
    expect(
      routeLine("Get somewhere", { from: "Home", to: "Café" }, words, "en"),
    ).toBe("Get somewhere · Home to Café");
  });

  it("names a place once when its address starts with the name", () => {
    expect(placeLine("Sonnenhof", "Sonnenhof, Sonnenstraße 12")).toBe(
      "Sonnenhof, Sonnenstraße 12",
    );
    expect(placeLine("Sonnenhof", "Sonnenstraße 12")).toBe(
      "Sonnenhof · Sonnenstraße 12",
    );
  });
});

describe("when and where a request asks for", () => {
  const lateNight = {
    requestedStartsAt: new Date("2026-10-08T23:30:00Z"),
    requestedEndsAt: new Date("2026-10-09T00:30:00Z"),
    chapter: { timeZone: "Europe/Berlin" },
  };

  it("reads the window on the chapter's clock, on the chapter's day", () => {
    expect(requestedWhen(lateNight, "en-GB")).toEqual({
      date: "Friday 9 October",
      time: "01:30 – 02:30",
    });
    expect(requestedWhen(lateNight, "en-GB", { short: true }).date).toBe(
      "Fri 09/10",
    );
  });

  it("names the pickup and the destination", () => {
    expect(
      requestedRoute({
        pickupName: "Sonnenhof",
        destinationName: "Hausarzt Dr. Weber",
      }),
    ).toEqual({ from: "Sonnenhof", to: "Hausarzt Dr. Weber" });
    expect(
      requestedRoute({
        pickupName: "Lindenweg 3",
        destinationName: null,
      }),
    ).toEqual({ from: "Lindenweg 3", to: null });
  });

  it("falls back to the address of a place without a name", () => {
    expect(placeLine(null, "Sonnenstraße 12")).toBe("Sonnenstraße 12");
    expect(placeLine("Sonnenhof", null)).toBe("Sonnenhof");
  });
});
