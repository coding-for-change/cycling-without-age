import { bookingSwitch, fieldsWithValues } from "./ride-history-values";

describe("fieldsWithValues", () => {
  it("shows a before and after for the fields that carry one", () => {
    expect(
      fieldsWithValues(
        ["capacity", "location"],
        { capacity: 2, locationName: null },
        { capacity: 3, locationName: "Park" },
      ),
    ).toEqual(["capacity", "location"]);
  });

  it("never turns the booking switch into nothing → nothing", () => {
    expect(
      fieldsWithValues(
        ["announced"],
        { announced: false },
        { announced: true },
      ),
    ).toEqual([]);
    expect(fieldsWithValues(["announced"], {}, {})).toEqual([]);
  });

  it("leaves out a field the entry logged without its values", () => {
    expect(fieldsWithValues(["title", "photos", "note"], {}, {})).toEqual([]);
  });
});

describe("bookingSwitch", () => {
  it("says which way booking went", () => {
    expect(bookingSwitch(["announced"], { announced: true })).toBe(
      "bookingOpened",
    );
    expect(bookingSwitch(["announced"], { announced: false })).toBe(
      "bookingClosed",
    );
  });

  it("keeps the generic sentence for an entry logged without its values", () => {
    expect(bookingSwitch(["announced"], {})).toBeNull();
  });

  it("keeps the generic sentence when more than booking changed", () => {
    expect(
      bookingSwitch(["model", "announced"], { announced: false }),
    ).toBeNull();
  });
});
