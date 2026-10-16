import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import type { EventOf } from "@/lib/events/catalog";
import { renderIcs, rideUid } from "@/lib/ics";
import {
  riderHandedOver,
  rideRequestDeclined,
  rideRequestScheduled,
  rideRequestSubmitted,
  rideRequestWithdrawn,
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

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date("2026-10-20T08:00:00Z"),
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});
afterAll(() => jest.useRealTimers());

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

const legsIn = (ics: string) =>
  ics.replace(/\r\n /g, "").split("BEGIN:VEVENT").slice(1);

const legOf = (ics: string, rideId: string) =>
  legsIn(ics).find((leg) => leg.includes(`UID:${rideUid(rideId)}\r\n`));

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

describe("a withdrawn request", () => {
  const withdrawn: EventOf<"rideRequest.withdrawn"> = {
    type: "rideRequest.withdrawn",
    requestId: "request-1",
    chapterId: MUNICH,
    actorUserId: ADMIN,
  };

  it("reaches the chapter's admins, not the one who closed it", async () => {
    expect(await rideRequestWithdrawn.recipients(withdrawn)).toEqual([
      "user-admin-2",
    ]);
  });

  it("folds into the chapter's one card of requests", () => {
    expect(rideRequestWithdrawn.collapseKey?.(withdrawn)).toBe(
      `requests:${MUNICH}`,
    );
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
    expect(ics).toContain(`UID:${rideUid("ride-1")}`);
    expect(ics).toContain(`UID:${rideUid("ride-2")}`);
    expect(ics).not.toContain("Erna");
    expect(ics).not.toContain("Huber");
  });

  it("carries a single calendar event for a ride one way", async () => {
    const params = await rideRequestScheduled.hydrate!(
      await rideRequestScheduled.params({ ...scheduled, returnLegId: null }),
    );
    const [file] = rideRequestScheduled.attachments!(
      params,
      getEmailStrings("en"),
      "en",
    );
    const ics = renderIcs(file.calendar);

    expect(legsIn(ics)).toHaveLength(1);
    expect(legOf(ics, "ride-1")).toContain("DTSTART:20261027T080000Z");
    expect(legOf(ics, "ride-2")).toBeUndefined();
  });

  it("puts each leg where it is picked up", async () => {
    (rides.getRideFacts as jest.Mock).mockImplementation(async (id: string) =>
      id === "ride-2"
        ? { ...legs["ride-2"], locationName: "Praxis Weber Hintereingang" }
        : (legs[id] ?? null),
    );
    const params = await rideRequestScheduled.hydrate!(
      await rideRequestScheduled.params(scheduled),
    );
    const ics = renderIcs(
      rideRequestScheduled.attachments!(params, getEmailStrings("en"), "en")[0]
        .calendar,
    );

    expect(legOf(ics, "ride-1")).toContain("LOCATION:Lindenweg 3\r\n");
    expect(legOf(ics, "ride-2")).toContain(
      "LOCATION:Praxis Weber Hintereingang\r\n",
    );
  });

  it("starts the way back where the way there ended when it names no place", async () => {
    (rides.getRideFacts as jest.Mock).mockImplementation(async (id: string) =>
      id === "ride-2"
        ? { ...legs["ride-2"], locationName: null }
        : (legs[id] ?? null),
    );
    const params = await rideRequestScheduled.hydrate!(
      await rideRequestScheduled.params(scheduled),
    );
    const ics = renderIcs(
      rideRequestScheduled.attachments!(params, getEmailStrings("en"), "en")[0]
        .calendar,
    );

    expect(legOf(ics, "ride-2")).toContain("LOCATION:Hausarzt Dr. Weber\r\n");
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
    invited: false,
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

  it("leaves an account set up for the rider to its invitation", async () => {
    expect(
      await riderHandedOver.recipients({ ...event, invited: true }),
    ).toEqual([CARER]);
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
