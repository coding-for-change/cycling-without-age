import { calendarFeeds } from "@/features/calendar-feeds";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { renderCalendarFeed } from "./calendar-feed";

jest.mock("@/features/calendar-feeds", () => ({
  calendarFeeds: { openFeed: jest.fn(), recordFetch: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listMembershipsOfUser: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { listPassengersManagedBy: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  rides: { listRidesForCalendarFeed: jest.fn() },
}));
jest.mock("@/lib/app-url", () => ({ APP_URL: "https://cwa.example" }));
jest.mock("@/lib/observability/logger", () => ({
  logger: { warn: jest.fn() },
}));

const openFeed = calendarFeeds.openFeed as jest.Mock;
const recordFetch = calendarFeeds.recordFetch as jest.Mock;
const managedBy = passengers.listPassengersManagedBy as jest.Mock;
const memberships = membership.listMembershipsOfUser as jest.Mock;
const feedRides = rides.listRidesForCalendarFeed as jest.Mock;

const NOW = new Date("2026-09-23T10:00:00Z");

const ride = (over: Record<string, unknown> = {}) => ({
  id: "ride-1",
  chapterId: "chapter-muenchen",
  model: "event",
  status: "scheduled",
  startsAt: new Date("2026-10-03T08:00:00Z"),
  endsAt: new Date("2026-10-03T09:30:00Z"),
  updatedAt: new Date("2026-09-20T12:00:00Z"),
  locationName: "Seniorenheim Sonnenhof",
  locationAddress: "Hauptstraße 1, München",
  destinationName: null,
  destinationAddress: null,
  chapter: { name: "CWA München" },
  trishaws: [{ trishaw: { name: "Sonnenstrahl" } }],
  assignments: [],
  ...over,
});

const lines = (ics: string | null) =>
  (ics ?? "").replace(/\r\n /g, "").split("\r\n");

beforeEach(() => {
  jest.clearAllMocks();
  openFeed.mockResolvedValue({ id: "feed-1", userId: "user-1", locale: "en" });
  recordFetch.mockResolvedValue(undefined);
  managedBy.mockResolvedValue([{ id: "passenger-1", firstName: "Erna" }]);
  memberships.mockResolvedValue([
    { chapterId: "chapter-muenchen", roles: ["pilot"] },
    { chapterId: "chapter-hamburg", roles: ["passenger"] },
  ]);
  feedRides.mockResolvedValue([ride()]);
});

describe("renderCalendarFeed", () => {
  it("opens nothing, and reads nothing, for an address that opens nothing", async () => {
    openFeed.mockResolvedValue(null);
    expect(await renderCalendarFeed("nope", NOW)).toBeNull();
    expect(managedBy).not.toHaveBeenCalled();
    expect(memberships).not.toHaveBeenCalled();
    expect(feedRides).not.toHaveBeenCalled();
    expect(recordFetch).not.toHaveBeenCalled();
  });

  it("asks for the reader's own rides and the riders they manage", async () => {
    await renderCalendarFeed("token", NOW);
    expect(managedBy).toHaveBeenCalledWith("user-1");
    expect(feedRides).toHaveBeenCalledWith(
      "user-1",
      {
        pilotChapterIds: ["chapter-muenchen", "chapter-hamburg"],
        passengerIds: ["passenger-1"],
      },
      new Date("2026-06-25T10:00:00Z"),
      new Date("2027-10-28T10:00:00Z"),
    );
    expect(recordFetch).toHaveBeenCalledWith("feed-1", NOW);
  });

  it("writes a rider's ride with where, when and which bike", async () => {
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("UID:ride-ride-1@cwa.example");
    expect(out).toContain("SUMMARY:Event ride");
    expect(out).toContain("DTSTART:20261003T080000Z");
    expect(out).toContain(
      "LOCATION:Seniorenheim Sonnenhof\\, Hauptstraße 1\\, München",
    );
    expect(out).toContain(
      "DESCRIPTION:CWA München\\nTrishaw: Sonnenstrahl\\nDetails in the app: https://cwa.example/passenger",
    );
    expect(out).toContain("STATUS:CONFIRMED");
  });

  it("tells a pilot it is their shift and links them to their side", async () => {
    feedRides.mockResolvedValue([ride({ assignments: [{ role: "pilot" }] })]);
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("SUMMARY:Pilot · Event ride");
    expect(out).toContain("URL:https://cwa.example/pilot");
  });

  // Rides a removed pilot still has an assignment on only reach the feed
  // through a rider they manage — and then they are not the pilot.
  it("does not call someone the pilot once they have left the chapter", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-hamburg", roles: ["pilot"] },
    ]);
    feedRides.mockResolvedValue([ride({ assignments: [{ role: "pilot" }] })]);
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("SUMMARY:Event ride");
  });

  // `/pilot` turns away anyone without the pilot role, assignments or not.
  it("stops showing piloted rides once the pilot role is taken away", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-muenchen", roles: ["passenger"] },
    ]);
    await renderCalendarFeed("token", NOW);
    expect(feedRides).toHaveBeenCalledWith(
      "user-1",
      { pilotChapterIds: [], passengerIds: ["passenger-1"] },
      expect.any(Date),
      expect.any(Date),
    );
  });

  it("keeps a cancelled ride on the calendar, marked as cancelled", async () => {
    feedRides.mockResolvedValue([ride({ status: "cancelled" })]);
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("SUMMARY:Cancelled: Event ride");
    expect(out).toContain("STATUS:CANCELLED");
  });

  it("gives a functional ride its destination", async () => {
    feedRides.mockResolvedValue([
      ride({
        model: "functional",
        destinationName: "Klinikum",
        destinationAddress: null,
      }),
    ]);
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("SUMMARY:Functional ride");
    expect(out.join("\n")).toContain("To Klinikum");
  });

  it("speaks the reader's language, not the server's", async () => {
    openFeed.mockResolvedValue({
      id: "feed-1",
      userId: "user-1",
      locale: "de",
    });
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("X-WR-CALNAME:Radeln ohne Alter");
    expect(out).toContain("SUMMARY:Gruppenfahrt");
  });

  it("names nobody — not the riders the reader manages either", async () => {
    const ics = await renderCalendarFeed("token", NOW);
    expect(ics).not.toContain("Erna");
  });

  // "Last picked up" is a courtesy to the reader; it must never cost them the feed.
  it("still serves the rides when recording the fetch fails", async () => {
    recordFetch.mockRejectedValue(new Error("Lock wait timeout exceeded"));
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out).toContain("SUMMARY:Event ride");
  });

  it("is still a valid, empty calendar when there is nothing to ride", async () => {
    feedRides.mockResolvedValue([]);
    const out = lines(await renderCalendarFeed("token", NOW));
    expect(out[0]).toBe("BEGIN:VCALENDAR");
    expect(out).not.toContain("BEGIN:VEVENT");
  });
});
