import {
  debriefInput,
  parseDecimal,
  walkUpInput,
} from "@/features/rides/schemas";
import { formatNumber } from "@/lib/format";

describe("debriefInput", () => {
  const debrief = (fields: Record<string, unknown>) =>
    debriefInput.safeParse({ rideId: "ride-1", ...fields }).success;

  it("takes a debrief with nothing filled in, as all nulls", () => {
    expect(debriefInput.parse({ rideId: "ride-1" })).toEqual({
      rideId: "ride-1",
      distanceKm: null,
      bikeCondition: null,
      cooperation: null,
      note: null,
    });
  });

  it("refuses what no ride could have", () => {
    expect(debrief({ distanceKm: -1 })).toBe(false);
    expect(debrief({ distanceKm: 1000.01 })).toBe(false);
    expect(debrief({ bikeCondition: "great" })).toBe(false);
    expect(debrief({ note: "x".repeat(2001) })).toBe(false);
  });

  it("keeps two decimals of a distance and drops a blank note", () => {
    expect(
      debriefInput.parse({ rideId: "r", distanceKm: 7.456, note: "  " }),
    ).toMatchObject({ distanceKm: 7.46, note: null });
  });
});

describe("parseDecimal", () => {
  it("reads either notation's decimal mark", () => {
    expect(parseDecimal("12,50")).toBe(12.5);
    expect(parseDecimal("12.50")).toBe(12.5);
    expect(parseDecimal(" 7 ")).toBe(7);
    expect(parseDecimal("")).toBeNull();
  });

  // A thousands separator is refused rather than guessed at.
  it.each(["1.234,50", "1,234", "1 000", "-3", "12.", ".5", "12,345"])(
    "refuses %s",
    (raw) => {
      expect(parseDecimal(raw)).toBeNaN();
    },
  );

  it.each(["en-GB", "en-US", "de-DE", "da-DK"] as const)(
    "reads back what the form wrote in %s",
    (notation) => {
      const shown = formatNumber(12.5, notation, {
        useGrouping: false,
        maximumFractionDigits: 2,
      });
      expect(parseDecimal(shown)).toBe(12.5);
      expect(Math.round(parseDecimal("0,29")! * 100)).toBe(29);
    },
  );
});

describe("walkUpInput", () => {
  it("needs a first name and takes a last name when there is one", () => {
    expect(
      walkUpInput.safeParse({ rideId: "r", firstName: "  " }).success,
    ).toBe(false);
    expect(
      walkUpInput.safeParse({ rideId: "r", firstName: "x".repeat(81) }).success,
    ).toBe(false);
    expect(walkUpInput.parse({ rideId: "r", firstName: " Inge " })).toEqual({
      rideId: "r",
      firstName: "Inge",
      lastName: "",
    });
  });
});
