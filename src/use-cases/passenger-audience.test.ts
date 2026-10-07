import { audienceOf } from "./passenger-audience";

jest.mock("@/features/passengers", () => ({ passengers: {} }));
jest.mock("@/features/profile", () => ({ profile: {} }));

describe("audienceOf", () => {
  it("speaks to a rider who books only for themself", () => {
    expect(
      audienceOf({ managesOthers: false, ridesThemself: true, riderNames: [] })
        .who,
    ).toBe("self");
  });

  it("names the one person a caretaker looks after", () => {
    expect(
      audienceOf({
        managesOthers: true,
        ridesThemself: false,
        riderNames: ["Inge"],
      }),
    ).toEqual({ who: "one", name: "Inge", count: 1 });
  });

  it("speaks of the people looked after when there are several", () => {
    expect(
      audienceOf({
        managesOthers: true,
        ridesThemself: false,
        riderNames: ["Inge", "Karl"],
      }).who,
    ).toBe("many");
  });

  it("covers both when the caretaker rides too", () => {
    expect(
      audienceOf({
        managesOthers: true,
        ridesThemself: true,
        riderNames: ["Inge"],
      }),
    ).toEqual({ who: "withOne", name: "Inge", count: 1 });
    expect(
      audienceOf({
        managesOthers: true,
        ridesThemself: true,
        riderNames: ["Inge", "Karl"],
      }).who,
    ).toBe("withMany");
  });

  it("still addresses a caretaker who has not added anyone yet", () => {
    expect(
      audienceOf({ managesOthers: true, ridesThemself: false, riderNames: [] })
        .who,
    ).toBe("many");
  });
});
