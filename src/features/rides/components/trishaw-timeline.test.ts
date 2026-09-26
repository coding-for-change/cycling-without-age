import type { RideCalendarRow } from "../facade";
import { foreignBooking } from "./trishaw-timeline";

const ride = {
  id: "ride-1",
  chapterId: "chapter-augsburg",
  startsAt: new Date("2026-10-01T09:00:00Z"),
  endsAt: new Date("2026-10-01T11:00:00Z"),
  status: "scheduled",
  model: "functional",
  locationName: "Seniorenheim Lechblick",
  destinationName: "Hausarzt Dr. Weber",
  trishaws: [
    { trishaw: { id: "trishaw-7", name: "Rikscha 7" } },
    { trishaw: { id: "trishaw-9", name: "Augsburgs eigene" } },
  ],
  assignments: [{ role: "pilot", user: { id: "u-1", name: "Piet" } }],
} as unknown as RideCalendarRow;

describe("foreignBooking", () => {
  it("keeps only when the listed bike is taken", () => {
    const booking = foreignBooking(ride, new Set(["trishaw-7"]));
    expect(booking).toEqual({
      id: "ride-1",
      startsAt: ride.startsAt,
      endsAt: ride.endsAt,
      status: "scheduled",
      model: "functional",
      locationName: null,
      destinationName: null,
      trishaws: [{ trishaw: { id: "trishaw-7" } }],
      foreign: true,
    });
    expect(JSON.stringify(booking)).not.toMatch(/Weber|Lechblick|Piet|Rikscha/);
  });
});
