import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import type { EventOf } from "@/lib/events/catalog";
import { renderIcs } from "@/lib/ics";
import {
  riderHandedOver,
  rideRequestDeclined,
  rideRequestScheduled,
  rideRequestSubmitted,
} from "./ride-requests";
import { rideBookingConfirmed } from "./rides";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getSettings: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: { passengerNames: jest.fn(), getPassenger: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { getRequest: jest.fn(), getRequestScope: jest.fn() },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: { getRideFacts: jest.fn(), listRideParticipants: jest.fn() },
}));

const MUNICH = "chapter-muenchen";
const CARER = "user-carer";
const ADMIN = "user-admin";

const scope = rideRequests.getRequestScope as jest.Mock;

const REQUEST = {
  id: "request-1",
  model: "functional",
  requestedStartsAt: new Date("2026-10-27T08:00:00Z"),
  requestedEndsAt: new Date("2026-10-27T09:00:00Z"),
  pickupName: "Lindenweg 3",
  destinationName: "Hausarzt Dr. Weber",
  roundTrip: true,
  requesterUserId: CARER,
  decisionNote: "No pilot is free that morning.",
  chapter: { name: "München", timeZone: "Europe/Berlin" },
  passengers: [{ passenger: { id: "mother" } }],
};

const legs: Record<string, object> = {
  "ride-1": {
    title: null,
    model: "functional",
    startsAt: new Date("2026-10-27T08:00:00Z"),
    endsAt: new Date("2026-10-27T08:45:00Z"),
    locationName: "Lindenweg 3",
    destinationName: "Hausarzt Dr. Weber",
    chapter: { name: "München", timeZone: "Europe/Berlin" },
  },
  "ride-2": {
    title: null,
    model: "functional",
    startsAt: new Date("2026-10-27T09:45:00Z"),
    endsAt: new Date("2026-10-27T10:30:00Z"),
    locationName: "Hausarzt Dr. Weber",
    destinationName: "Lindenweg 3",
    chapter: { name: "München", timeZone: "Europe/Berlin" },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  scope.mockResolvedValue({
    id: "request-1",
    chapterId: MUNICH,
    status: "pending",
    requesterUserId: CARER,
  });
  (rideRequests.getRequest as jest.Mock).mockResolvedValue(REQUEST);
  (membership.listChapterAdmins as jest.Mock).mockResolvedValue([
    { userId: ADMIN },
    { userId: "user-admin-2" },
  ]);
  (passengers.passengerNames as jest.Mock).mockResolvedValue({
    mother: "Erna Huber",
  });
  (profile.getProfile as jest.Mock).mockResolvedValue({ name: "Anna Huber" });
  (rides.getRideFacts as jest.Mock).mockImplementation(
    async (id: string) => legs[id] ?? null,
  );
  (chapters.getChapter as jest.Mock).mockResolvedValue({ name: "München" });
  (chapters.getSettings as jest.Mock).mockResolvedValue(
    DEFAULT_CHAPTER_SETTINGS,
  );
});

describe("a new request", () => {
  const submitted: EventOf<"rideRequest.submitted"> = {
    type: "rideRequest.submitted",
    requestId: "request-1",
    chapterId: MUNICH,
    actorUserId: CARER,
  };

  it("reaches the chapter's admins while it is still waiting", async () => {
    expect(await rideRequestSubmitted.recipients(submitted)).toEqual([
      ADMIN,
      "user-admin-2",
    ]);
  });

  it("reaches nobody once it became a ride or was taken back", async () => {
    scope.mockResolvedValue({ status: "scheduled" });
    expect(await rideRequestSubmitted.recipients(submitted)).toEqual([]);
  });

  it("shares one card per chapter and asks the chapter about push", async () => {
    expect(rideRequestSubmitted.collapseKey?.(submitted)).toBe(
      `requests:${MUNICH}`,
    );
    (chapters.getSettings as jest.Mock).mockResolvedValue({
      ...DEFAULT_CHAPTER_SETTINGS,
      requestAlertPush: false,
    });
    expect(await rideRequestSubmitted.chapterAllowsPush?.(MUNICH)).toBe(false);
  });

  it("names the riders and who asked only when the message is written", async () => {
    const params = await rideRequestSubmitted.params(submitted);
    expect(JSON.stringify(params)).not.toContain("Erna");
    const message = rideRequestSubmitted.message(
      await rideRequestSubmitted.hydrate!(params),
      getEmailStrings("en"),
      "en",
    );
    expect(message.body).toContain("Anna Huber");
    expect(message.body).toContain("Erna Huber");
    expect(message.body).toContain("and back again");
  });
});

describe("a scheduled request", () => {
  const scheduled: EventOf<"rideRequest.scheduled"> = {
    type: "rideRequest.scheduled",
    requestId: "request-1",
    chapterId: MUNICH,
    actorUserId: ADMIN,
    requesterUserId: CARER,
    rideId: "ride-1",
    returnLegId: "ride-2",
  };

  it("tells the requester and links their ride", async () => {
    expect(await rideRequestScheduled.recipients(scheduled)).toEqual([CARER]);
    expect(rideRequestScheduled.href(scheduled)).toBe(
      "/passenger/rides/ride-1",
    );
  });

  it("carries one calendar event per leg, and nobody's name", async () => {
    const params = await rideRequestScheduled.hydrate!(
      await rideRequestScheduled.params(scheduled),
    );
    const [file] = rideRequestScheduled.attachments!(
      params,
      getEmailStrings("de"),
      "de",
    );
    const ics = renderIcs(file.calendar);

    expect(file.filename).toMatch(/\.ics$/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261027T080000Z");
    expect(ics).toContain("DTSTART:20261027T094500Z");
    expect(ics).toContain("UID:ride-ride-1@");
    expect(ics).toContain("UID:ride-ride-2@");
    expect(ics).not.toContain("Erna");
    expect(ics).not.toContain("Huber");
  });

  it("says when the way back leaves", async () => {
    const params = await rideRequestScheduled.hydrate!(
      await rideRequestScheduled.params(scheduled),
    );
    const message = rideRequestScheduled.message(
      params,
      getEmailStrings("en"),
      "en",
    );
    expect(message.body).toContain("there and back");
    expect(message.body).toContain("Erna Huber");
  });

  it("keeps the requester's booking confirmation out of their inbox", async () => {
    (passengers.getPassenger as jest.Mock).mockResolvedValue({
      firstName: "Erna",
      lastName: "Huber",
      managedByUserId: CARER,
      userId: "user-erna",
    });
    expect(
      await rideBookingConfirmed.recipients({
        type: "ride.riderBooked",
        rideId: "ride-1",
        chapterId: MUNICH,
        actorUserId: ADMIN,
        passengerId: "mother",
        pair: null,
        requestId: "request-1",
      }),
    ).toEqual(["user-erna"]);
  });
});

it("hands the decline note to the requester", async () => {
  const event: EventOf<"rideRequest.declined"> = {
    type: "rideRequest.declined",
    requestId: "request-1",
    chapterId: MUNICH,
    actorUserId: ADMIN,
    requesterUserId: CARER,
  };
  expect(await rideRequestDeclined.recipients(event)).toEqual([CARER]);
  const message = rideRequestDeclined.message(
    await rideRequestDeclined.hydrate!(await rideRequestDeclined.params(event)),
    getEmailStrings("de"),
    "de",
  );
  expect(message.note?.text).toBe("No pilot is free that morning.");
});

describe("a rider handed over", () => {
  const event: EventOf<"rider.handedOver"> = {
    type: "rider.handedOver",
    passengerId: "mother",
    chapterId: MUNICH,
    actorUserId: ADMIN,
    fromUserId: CARER,
    toUserId: "user-daughter",
  };

  it("tells the new and the old manager, not the admin who did it", async () => {
    expect(await riderHandedOver.recipients(event)).toEqual([
      "user-daughter",
      CARER,
    ]);
    expect(
      await riderHandedOver.recipients({ ...event, actorUserId: CARER }),
    ).toEqual(["user-daughter"]);
  });

  it("writes each of them their own message", async () => {
    const params = await riderHandedOver.params(event);
    const to = riderHandedOver.forRecipient!(params, "user-daughter");
    const from = riderHandedOver.forRecipient!(params, CARER);
    const strings = getEmailStrings("en");
    expect(riderHandedOver.message(to, strings, "en").template).toBe(
      "riderHandedOver",
    );
    expect(riderHandedOver.message(from, strings, "en").template).toBe(
      "riderHandedAway",
    );
  });
});
