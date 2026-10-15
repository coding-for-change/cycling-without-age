import { pickupLabel, pickupOf, shortAddress } from "./pickup";

const none = {
  residence: null,
  address: null,
  latitude: null,
  longitude: null,
};

const home = {
  residence: "home" as const,
  address: "Hauptstraße 1, 80331 München",
  latitude: 48.1,
  longitude: 11.5,
};

describe("pickupOf", () => {
  it("reads a managed rider's pickup from the rider", () => {
    expect(pickupOf({ ...home, user: null })).toEqual(home);
  });

  it("reads a rider with their own account from their account, not the row", () => {
    expect(
      pickupOf({
        ...home,
        user: { ...none, residence: "careHome" },
      }),
    ).toEqual({ ...none, residence: "careHome" });
  });

  it("ignores the account's empty pickup rather than falling back to the row", () => {
    expect(pickupOf({ ...home, user: none })).toBeNull();
  });

  it("is null when nobody has said where the rider lives", () => {
    expect(pickupOf(none)).toBeNull();
  });

  it("drops a blank address but keeps that the rider lives at home", () => {
    expect(pickupOf({ ...none, residence: "home", address: "  " })).toEqual({
      ...none,
      residence: "home",
    });
  });
});

describe("pickupLabel", () => {
  it("says care home for a care-home rider", () => {
    expect(
      pickupLabel(pickupOf({ ...none, residence: "careHome" }), "Care home"),
    ).toBe("Care home");
  });

  it("gives the street of a home address", () => {
    expect(pickupLabel(pickupOf(home), "Care home")).toBe("Hauptstraße 1");
  });

  it("has nothing to say without a pickup or an address", () => {
    expect(pickupLabel(null, "Care home")).toBeNull();
    expect(
      pickupLabel(pickupOf({ ...none, residence: "home" }), "Care home"),
    ).toBeNull();
  });
});

describe("shortAddress", () => {
  it("keeps an address without a comma whole", () => {
    expect(shortAddress(" Am Markt 3 ")).toBe("Am Markt 3");
  });

  it("falls back to the whole address when it starts with a comma", () => {
    expect(shortAddress(", München")).toBe(", München");
  });
});
