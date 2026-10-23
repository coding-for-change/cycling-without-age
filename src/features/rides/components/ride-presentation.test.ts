import { rideCardPlace, rideHeadline } from "./ride-presentation";

const strings = {
  via: "to",
  models: {
    event: "Event ride",
    functional: "Functional ride",
    pleasure: "Pleasure ride",
  },
};

const phrases = {
  rideTo: "Ride to {destination}",
  rideFrom: "Ride from {place}",
  words: "en-GB" as const,
};

const ride = (
  overrides: Partial<{
    model: "event" | "functional" | "pleasure";
    title: string | null;
    locationName: string | null;
    destinationName: string | null;
  }>,
) => ({
  model: "pleasure" as const,
  title: null,
  locationName: null,
  destinationName: null,
  ...overrides,
});

describe("rideHeadline", () => {
  it("uses the event's own title", () => {
    expect(
      rideHeadline(
        ride({
          model: "event",
          title: " Summer picnic ",
          locationName: "Park",
        }),
        strings,
        phrases,
      ),
    ).toBe("Summer picnic");
  });

  it("names the destination of a functional ride", () => {
    expect(
      rideHeadline(
        ride({
          model: "functional",
          locationName: "Sonnenhof",
          destinationName: "Dr. Weber",
        }),
        strings,
        phrases,
      ),
    ).toBe("Ride to Dr. Weber");
  });

  it("names the starting place of a pleasure ride", () => {
    expect(
      rideHeadline(
        ride({ model: "pleasure", locationName: "Sonnenhof" }),
        strings,
        phrases,
      ),
    ).toBe("Ride from Sonnenhof");
  });

  it("ignores a title on a ride that is not an event", () => {
    expect(
      rideHeadline(
        ride({
          model: "pleasure",
          title: "Ignored",
          locationName: "Sonnenhof",
        }),
        strings,
        phrases,
      ),
    ).toBe("Ride from Sonnenhof");
  });

  it("falls back to the route without phrases", () => {
    expect(
      rideHeadline(
        ride({
          model: "functional",
          locationName: "Sonnenhof",
          destinationName: "Dr. Weber",
        }),
        strings,
      ),
    ).toBe("Sonnenhof to Dr. Weber");
  });

  it("falls back to the place, then the model name", () => {
    expect(
      rideHeadline(
        ride({ model: "functional", locationName: "Sonnenhof" }),
        strings,
        phrases,
      ),
    ).toBe("Sonnenhof");
    expect(rideHeadline(ride({ model: "event" }), strings, phrases)).toBe(
      "Event ride",
    );
  });
});

describe("rideCardPlace", () => {
  it("shows the pickup under a functional ride's destination", () => {
    expect(
      rideCardPlace(
        ride({
          model: "functional",
          locationName: "Sonnenhof",
          destinationName: "Dr. Weber",
        }),
      ),
    ).toBe("Sonnenhof");
  });

  it("does not repeat a place the headline already names", () => {
    expect(
      rideCardPlace(ride({ model: "pleasure", locationName: "Sonnenhof" })),
    ).toBeNull();
    expect(
      rideCardPlace(ride({ model: "event", locationName: "Park" })),
    ).toBeNull();
  });

  it("shows where an event happens", () => {
    expect(
      rideCardPlace(
        ride({ model: "event", title: "Picnic", locationName: "Park" }),
      ),
    ).toBe("Park");
  });
});
