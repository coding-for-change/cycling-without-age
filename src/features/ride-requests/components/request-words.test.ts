import { placeLine, routeLine, routeWay } from "./request-words";

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
