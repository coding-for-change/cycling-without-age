import { yearInReview } from "./year-in-review";

const ride = (
  start: string,
  hours: number,
  place: string | null,
  pilots: string[] = [],
) => {
  const startsAt = new Date(start);
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + hours * 3_600_000),
    locationName: place,
    pilotIds: pilots,
  };
};

it("tells nothing for a year without rides", () => {
  expect(yearInReview([], 2026)).toBeNull();
});

it("counts the rides, the time outside and the pilots met", () => {
  expect(
    yearInReview(
      [
        ride("2026-03-01T10:00:00Z", 2, "Sonnenhof", ["max"]),
        ride("2026-05-01T10:00:00Z", 1.5, "Englischer Garten", ["max", "eva"]),
        ride("2026-06-01T10:00:00Z", 2, "Sonnenhof", []),
      ],
      2026,
    ),
  ).toEqual({
    year: 2026,
    rides: 3,
    seconds: 5.5 * 3600,
    pilots: 2,
    favouritePlace: "Sonnenhof",
  });
});

it("names a favourite place only once it has been visited twice", () => {
  const review = yearInReview(
    [
      ride("2026-03-01T10:00:00Z", 1, "Sonnenhof"),
      ride("2026-04-01T10:00:00Z", 1, "Tierpark"),
    ],
    2026,
  );
  expect(review?.favouritePlace).toBeNull();
});

it("breaks a tie for the favourite with the place visited last", () => {
  const review = yearInReview(
    [
      ride("2026-01-01T10:00:00Z", 1, "Tierpark"),
      ride("2026-02-01T10:00:00Z", 1, "Sonnenhof"),
      ride("2026-03-01T10:00:00Z", 1, "Tierpark"),
      ride("2026-04-01T10:00:00Z", 1, " Sonnenhof "),
    ],
    2026,
  );
  expect(review?.favouritePlace).toBe("Sonnenhof");
});
