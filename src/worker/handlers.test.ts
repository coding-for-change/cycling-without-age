import { eventTypes } from "@/lib/events/catalog";
import { handlers } from "./handlers";

jest.mock("@/features/chapters", () => ({ chapters: {} }));
jest.mock("@/features/membership", () => ({ membership: {} }));
jest.mock("@/features/profile", () => ({ profile: {} }));
jest.mock("@/features/passengers", () => ({ passengers: {} }));

const listenersOf = (type: (typeof eventTypes)[number]) =>
  Object.keys(handlers[type]).sort();

describe("handlers", () => {
  it("has an entry for every event, even one nobody listens to", () => {
    expect(Object.keys(handlers).sort()).toEqual([...eventTypes].sort());
  });

  it("tells the people a reminder or an empty roster concerns", () => {
    for (const type of [
      "ride.riderReminderDue",
      "ride.volunteerReminderDue",
      "ride.noDemand",
    ] as const)
      expect(listenersOf(type)).toEqual(["notify"]);
  });

  it("keeps the ride's chat in step when a seat is given up or taken back", () => {
    expect(listenersOf("ride.riderRemoved")).toEqual([
      "notify",
      "syncRideChat",
    ]);
    expect(listenersOf("ride.riderBooked")).toEqual(["notify", "syncRideChat"]);
  });

  // The chat freezes in the completing use case itself, not in a listener.
  it("lets a closed or reopened roster pass without a job", () => {
    expect(listenersOf("ride.completed")).toEqual([]);
    expect(listenersOf("ride.reopened")).toEqual([]);
  });
});
