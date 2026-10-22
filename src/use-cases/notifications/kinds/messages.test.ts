import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { membership } from "@/features/membership";
import { fleet } from "@/features/fleet";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rideRequests } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import da from "@/messages/app/da.json";
import de from "@/messages/app/de.json";
import en from "@/messages/app/en.json";
import { locales, type Locale } from "@/lib/i18n/locales";
import type { DomainEvent, EventType } from "@/lib/events/catalog";
import { kinds } from "@/use-cases/notifications/kinds";
import type { AnyKind, Message } from "@/use-cases/notifications/kinds/types";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    getCountry: jest.fn(),
    getSettings: jest.fn(),
    listCountryAdmins: jest.fn(),
  },
}));
jest.mock("@/features/fleet", () => ({
  fleet: {
    getTrishaw: jest.fn(),
    getLocation: jest.fn(),
    listTrishawPlaces: jest.fn(),
  },
}));
jest.mock("@/features/membership", () => ({
  membership: {
    listChapterAdmins: jest.fn(),
    getMemberRoles: jest.fn(),
    listPilotMembers: jest.fn(),
  },
}));
jest.mock("@/features/rides", () => ({
  ...jest.requireActual("@/features/rides/schemas"),
  rides: {
    getRideFacts: jest.fn(),
    listRideParticipants: jest.fn(),
    getRideScope: jest.fn(),
  },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    getPassenger: jest.fn(),
    listBookingAccountsOfChapters: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/features/ride-requests", () => ({
  rideRequests: { getRequest: jest.fn(), getRequestScope: jest.fn() },
}));
jest.mock("@/features/passengers", () => ({
  passengers: {
    getOwnPassenger: jest.fn().mockResolvedValue(null),
    getCareRequest: jest
      .fn()
      .mockResolvedValue({ firstName: "Inge", lastName: "Holm" }),
    getCareRequestPreview: jest.fn().mockResolvedValue({ firstName: "Inge" }),
    getPassenger: jest
      .fn()
      .mockResolvedValue({ firstName: "Inge", lastName: "Holm" }),
    passengerNames: jest.fn(),
  },
}));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date("2026-10-20T08:00:00Z"),
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});
afterAll(() => jest.useRealTimers());

const getChapter = chapters.getChapter as jest.Mock;
const getCountry = chapters.getCountry as jest.Mock;
const getSettings = chapters.getSettings as jest.Mock;
const listChapterAdmins = membership.listChapterAdmins as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getTrishaw = fleet.getTrishaw as jest.Mock;
const getLocation = fleet.getLocation as jest.Mock;
const listCountryAdmins = chapters.listCountryAdmins as jest.Mock;
const getRideFacts = rides.getRideFacts as jest.Mock;
const listRideParticipants = rides.listRideParticipants as jest.Mock;
const getPassenger = passengers.getPassenger as jest.Mock;
const getMemberRoles = membership.getMemberRoles as jest.Mock;
const getRequest = rideRequests.getRequest as jest.Mock;
const getRequestScope = rideRequests.getRequestScope as jest.Mock;
const passengerNames = passengers.passengerNames as jest.Mock;
const getRideScope = rides.getRideScope as jest.Mock;
const listTrishawPlaces = fleet.listTrishawPlaces as jest.Mock;

const DICTIONARIES = { en, da, de } as Record<Locale, typeof en>;

const CHAPTER = "chapter-muenchen";
const COUNTRY = "country-de";
const SUBJECT = "user-pernille";
const ACTOR = "user-anke";

const EVENTS: Record<EventType, DomainEvent> = {
  "pilotApplication.decided": {
    type: "pilotApplication.decided",
    applicationId: "app-1",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
    approved: true,
    note: "Bring your own helmet.",
  },
  "pilotApplication.submitted": {
    type: "pilotApplication.submitted",
    applicationId: "app-1",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: SUBJECT,
  },
  "member.invited": {
    type: "member.invited",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
    roles: ["pilot", "admin"],
  },
  "member.roleChanged": {
    type: "member.roleChanged",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
    change: "promote",
    roles: ["pilot", "admin"],
  },
  "chapter.memberJoined": {
    type: "chapter.memberJoined",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
  },
  "user.onboarded": {
    type: "user.onboarded",
    userId: SUBJECT,
    chapterId: CHAPTER,
    role: "pilot",
  },
  "chat.messageSent": {
    type: "chat.messageSent",
    conversationId: "conversation-1",
    messageId: "message-1",
    seq: 1,
    actorUserId: ACTOR,
    chapterId: CHAPTER,
  },
  "countryAdmin.appointed": {
    type: "countryAdmin.appointed",
    countryId: COUNTRY,
    userId: SUBJECT,
    actorUserId: ACTOR,
    viaInvite: false,
  },
  "countryAdmin.removed": {
    type: "countryAdmin.removed",
    countryId: COUNTRY,
    userId: SUBJECT,
    actorUserId: ACTOR,
  },
  "adminInvite.created": {
    type: "adminInvite.created",
    inviteId: "0b9f6a0e-6f7a-4c43-9a51-1f2c3d4e5f60",
    kind: "countryAdmin",
    countryId: COUNTRY,
    userId: SUBJECT,
    actorUserId: ACTOR,
  },
  "superadmin.granted": {
    type: "superadmin.granted",
    inviteId: "0b9f6a0e-6f7a-4c43-9a51-1f2c3d4e5f60",
    userId: SUBJECT,
    actorUserId: ACTOR,
  },
  "superadmin.removed": {
    type: "superadmin.removed",
    userId: SUBJECT,
    actorUserId: ACTOR,
  },
  "trishaw.damageReported": {
    type: "trishaw.damageReported",
    damageId: "damage-1",
    trishawId: "trishaw-1",
    poolCountryId: COUNTRY,
    reachingChapterIds: [CHAPTER],
    chapterId: CHAPTER,
    actorUserId: SUBJECT,
    grounding: true,
    affectedRideIds: ["ride-1", "ride-2"],
  },
  "pool.accessRequested": {
    type: "pool.accessRequested",
    membershipId: "membership-1",
    poolId: "pool-1",
    countryId: COUNTRY,
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "care.requested": {
    type: "care.requested",
    requestId: "care-1",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
  },
  "care.decided": {
    type: "care.decided",
    requestId: "care-1",
    chapterId: CHAPTER,
    actorUserId: SUBJECT,
    requestedByUserId: ACTOR,
    accepted: true,
  },
  "care.invited": {
    type: "care.invited",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
    passengerId: "passenger-1",
  },
  "care.linked": {
    type: "care.linked",
    requestId: "care-1",
    chapterId: CHAPTER,
    userId: SUBJECT,
    actorUserId: ACTOR,
    passengerId: "passenger-1",
  },
  "trainingVideo.uploaded": {
    type: "trainingVideo.uploaded",
    videoId: "video-1",
    revision: 1,
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "trainingVideo.posterRequested": {
    type: "trainingVideo.posterRequested",
    videoId: "video-1",
    revision: 1,
    seconds: 3,
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "training.coursePassed": {
    type: "training.coursePassed",
    userId: "user-1",
    courseId: "course-1",
    familyId: "family-1",
    attemptId: "attempt-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "training.exemptionGranted": {
    type: "training.exemptionGranted",
    userId: "user-1",
    familyId: null,
    reason: "manual",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "training.exemptionRevoked": {
    type: "training.exemptionRevoked",
    userId: "user-1",
    familyId: "family-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "trainingVideo.deleted": {
    type: "trainingVideo.deleted",
    videoId: "video-1",
    mediaKey: "abcdefghijklmnopqrstuvwxyz",
    sourceKey: "training/sources/abcdefghijklmnopqrstuvwxyz",
    uploadId: null,
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "pool.accessDecided": {
    type: "pool.accessDecided",
    membershipId: "membership-1",
    poolId: "pool-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    approved: true,
    note: "Welcome aboard.",
  },
  "ride.scheduled": {
    type: "ride.scheduled",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    returnLegId: "ride-2",
    requestId: null,
  },
  "ride.rescheduled": {
    type: "ride.rescheduled",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    changes: ["time", "location"],
    pair: null,
  },
  "ride.cancelled": {
    type: "ride.cancelled",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    reasonCode: "weather",
    pair: null,
  },
  "ride.deleted": {
    type: "ride.deleted",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "ride.pilotAssigned": {
    type: "ride.pilotAssigned",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    userId: SUBJECT,
    self: false,
    pair: null,
  },
  "ride.pilotUnassigned": {
    type: "ride.pilotUnassigned",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: SUBJECT,
    userId: SUBJECT,
    self: true,
    pair: null,
  },
  "ride.riderBooked": {
    type: "ride.riderBooked",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    passengerId: "passenger-1",
    pair: null,
    requestId: null,
  },
  "ride.riderRemoved": {
    type: "ride.riderRemoved",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    passengerId: "passenger-1",
    self: true,
    rosterNowEmpty: false,
    pair: null,
  },
  "ride.rosterRefilled": {
    type: "ride.rosterRefilled",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: "user-carer",
    passengerId: "passenger-1",
  },
  "ride.riderReminderDue": {
    type: "ride.riderReminderDue",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: null,
    pair: null,
  },
  "ride.volunteerReminderDue": {
    type: "ride.volunteerReminderDue",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: null,
    pair: null,
  },
  "ride.noDemand": {
    type: "ride.noDemand",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: null,
    pair: null,
  },
  "ride.completed": {
    type: "ride.completed",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: SUBJECT,
    riders: 3,
    noShows: 1,
  },
  "ride.reopened": {
    type: "ride.reopened",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "ride.opened": {
    type: "ride.opened",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    pair: null,
  },
  "ride.understaffed": {
    type: "ride.understaffed",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: null,
    assigned: 1,
    required: 2,
    pair: null,
  },
  "ride.announced": {
    type: "ride.announced",
    rideId: "ride-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
  },
  "rideRequest.submitted": {
    type: "rideRequest.submitted",
    requestId: "request-1",
    chapterId: CHAPTER,
    actorUserId: SUBJECT,
  },
  "rideRequest.scheduled": {
    type: "rideRequest.scheduled",
    requestId: "request-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    requesterUserId: SUBJECT,
    rideId: "ride-1",
    returnLegId: "ride-2",
  },
  "rideRequest.declined": {
    type: "rideRequest.declined",
    requestId: "request-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    requesterUserId: SUBJECT,
  },
  "rideRequest.withdrawn": {
    type: "rideRequest.withdrawn",
    requestId: "request-1",
    chapterId: CHAPTER,
    actorUserId: SUBJECT,
  },
  "rider.handedOver": {
    type: "rider.handedOver",
    passengerId: "passenger-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    fromUserId: SUBJECT,
    toUserId: "user-new",
    invited: false,
  },
};

const VARIANTS: Partial<Record<EventType, DomainEvent[]>> = {
  "pilotApplication.decided": [
    { ...EVENTS["pilotApplication.decided"], approved: false } as DomainEvent,
  ],
  "ride.pilotAssigned": [
    {
      ...EVENTS["ride.pilotAssigned"],
      actorUserId: SUBJECT,
      self: true,
    } as DomainEvent,
  ],
  "rideRequest.submitted": [
    { ...EVENTS["rideRequest.submitted"], requestId: "request-pleasure" },
    { ...EVENTS["rideRequest.submitted"], requestId: "request-one-way" },
  ] as DomainEvent[],
  "rideRequest.scheduled": [
    { ...EVENTS["rideRequest.scheduled"], returnLegId: null } as DomainEvent,
  ],
  "rideRequest.declined": [
    {
      ...EVENTS["rideRequest.declined"],
      requestId: "request-no-note",
    } as DomainEvent,
  ],
  "rideRequest.withdrawn": [
    { ...EVENTS["rideRequest.withdrawn"], actorUserId: ACTOR } as DomainEvent,
  ],
};

const REQUEST_VARIANTS: Record<string, object> = {
  "request-pleasure": {
    model: "pleasure",
    destinationName: null,
    roundTrip: false,
  },
  "request-one-way": { roundTrip: false },
  "request-no-note": { decisionNote: null },
};

const eventsOf = (kind: AnyKind) => [
  EVENTS[kind.event],
  ...(VARIANTS[kind.event] ?? []),
];

const readings = async (kind: AnyKind, event: DomainEvent) => {
  const shared = kind.payload.parse(await kind.params(event));
  const readers = kind.forRecipient
    ? [...new Set(await kind.recipients(event))]
    : [];
  return [
    shared,
    ...readers.map((reader) =>
      kind.payload.parse(kind.forRecipient!(shared, reader)),
    ),
  ];
};

const messagesOf = async (kind: AnyKind, locale: Locale) => {
  const messages: Message[] = [];
  for (const event of eventsOf(kind))
    for (const params of await readings(kind, event))
      messages.push(kind.message(params, getEmailStrings(locale), locale));
  return messages;
};

const APP_RELATIVE = /^\/(?!\/)/;

const lines = (message: Message): string[] =>
  [
    message.subject,
    message.preview,
    message.title,
    message.heading,
    message.body,
    message.note?.heading,
    message.note?.text,
    message.steps?.heading,
    ...(message.steps?.items ?? []),
    message.cta,
    message.footer,
  ].filter((line): line is string => typeof line === "string");

const known = () => {
  getChapter.mockResolvedValue({ name: "München" });
  getCountry.mockResolvedValue({ name: "Deutschland" });
  getProfile.mockResolvedValue({ name: "Anke Weiss" });
  getTrishaw.mockResolvedValue({ name: "Sonnenstrahl" });
  getLocation.mockResolvedValue({ name: "Depot Sonnenhof" });
  getRideScope.mockResolvedValue({
    id: "ride-1",
    chapterId: CHAPTER,
    trishawIds: ["trishaw-1", "trishaw-2"],
  });
  listTrishawPlaces.mockResolvedValue([
    {
      trishaw: { id: "trishaw-1", name: "Sonnenstrahl" },
      location: {
        id: "loc-1",
        name: "Depot Sonnenhof",
        address: "Sonnenstraße 1",
        accessCode: "4711",
      },
    },
    { trishaw: { id: "trishaw-2", name: "Isarwind" }, location: null },
  ]);
  getRideFacts.mockResolvedValue({
    title: null,
    model: "functional",
    startsAt: new Date("2026-10-27T09:00:00Z"),
    endsAt: new Date("2026-10-27T10:30:00Z"),
    locationName: "Seniorenheim Sonnenhof",
    destinationName: "Hausarzt Dr. Weber",
    chapter: { name: "München", timeZone: "Europe/Berlin" },
  });
  getPassenger.mockResolvedValue({
    id: "passenger-1",
    chapterId: CHAPTER,
    firstName: "Erna",
    lastName: "Huber",
    managedByUserId: "user-carer",
    userId: null,
  });
  passengerNames.mockResolvedValue({ "passenger-1": "Erna Huber" });
  getRequestScope.mockResolvedValue({
    id: "request-1",
    chapterId: CHAPTER,
    status: "pending",
    requesterUserId: SUBJECT,
  });
  getRequest.mockImplementation(async (requestId: string) => ({
    id: requestId,
    model: "functional",
    requestedStartsAt: new Date("2026-10-27T08:00:00Z"),
    requestedEndsAt: new Date("2026-10-27T09:00:00Z"),
    pickupName: "Seniorenheim Sonnenhof",
    destinationName: "Hausarzt Dr. Weber",
    roundTrip: true,
    requesterUserId: SUBJECT,
    decisionNote: "No pilot is free that morning.",
    chapter: { name: "München", timeZone: "Europe/Berlin" },
    passengers: [{ passenger: { id: "passenger-1" } }],
    ...REQUEST_VARIANTS[requestId],
  }));
};

const unknown = () => {
  getChapter.mockResolvedValue(null);
  getCountry.mockResolvedValue(null);
  getProfile.mockResolvedValue(null);
  getTrishaw.mockResolvedValue(null);
  getLocation.mockResolvedValue(null);
  getRideScope.mockResolvedValue(null);
  getRideFacts.mockResolvedValue(null);
  getPassenger.mockResolvedValue(null);
  passengerNames.mockResolvedValue({});
  getRequestScope.mockResolvedValue(null);
  getRequest.mockResolvedValue(null);
};

beforeEach(() => {
  jest.clearAllMocks();
  listChapterAdmins.mockResolvedValue([{ userId: ACTOR }]);
  listCountryAdmins.mockResolvedValue([{ userId: ACTOR }]);
  getSettings.mockResolvedValue(DEFAULT_CHAPTER_SETTINGS);
  listRideParticipants.mockResolvedValue({
    chapterId: CHAPTER,
    pilotUserIds: [SUBJECT],
    riderAccountUserIds: ["user-carer"],
  });
  getMemberRoles.mockResolvedValue(["passenger"]);
  known();
});

describe.each(kinds.map((kind) => [kind.event, kind] as const))(
  "%s",
  (_event, kind) => {
    const event = EVENTS[kind.event];

    it("points somewhere inside the app", () => {
      expect(kind.href(event)).toMatch(APP_RELATIVE);
    });

    it.each(locales)("reads as finished prose in %s", async (locale) => {
      for (const message of await messagesOf(kind, locale)) {
        expect(lines(message).length).toBeGreaterThan(3);
        for (const line of lines(message)) {
          expect(line).not.toMatch(/\{\w+\}/);
          expect(line).not.toMatch(/\b(null|undefined)\b/);
          expect(line.trim()).not.toBe("");
        }
        expect(message.template).toEqual(expect.any(String));
      }
    });

    it.each(locales)(
      "still reads as finished prose in %s with nothing named",
      async (locale) => {
        unknown();
        for (const message of await messagesOf(kind, locale)) {
          for (const line of lines(message)) {
            expect(line).not.toMatch(/\{\w+\}/);
            expect(line).not.toMatch(/\b(null|undefined)\b/);
          }
        }
      },
    );
  },
);

describe("a message for both legs of a round trip", () => {
  const lead = { role: "lead" as const, otherRideId: "ride-2" };
  const paired = [
    { ...EVENTS["ride.cancelled"], pair: lead },
    { ...EVENTS["ride.rescheduled"], changes: ["time"], pair: lead },
    { ...EVENTS["ride.pilotAssigned"], pair: lead },
    {
      ...EVENTS["ride.pilotAssigned"],
      actorUserId: SUBJECT,
      self: true,
      pair: lead,
    },
    { ...EVENTS["ride.pilotUnassigned"], pair: lead },
    { ...EVENTS["ride.understaffed"], pair: lead },
    { ...EVENTS["ride.riderBooked"], pair: lead },
    { ...EVENTS["ride.opened"], pair: lead },
    { ...EVENTS["ride.riderReminderDue"], pair: lead },
    { ...EVENTS["ride.volunteerReminderDue"], pair: lead },
    { ...EVENTS["ride.noDemand"], pair: lead },
    { ...EVENTS["ride.riderRemoved"], pair: lead },
    { ...EVENTS["ride.riderRemoved"], rosterNowEmpty: true, pair: lead },
  ] as DomainEvent[];

  it.each(locales)("reads as finished prose in %s", async (locale) => {
    for (const event of paired) {
      const kind = kinds.find((candidate) => candidate.event === event.type)!;
      const params = kind.payload.parse(await kind.params(event));
      const message = kind.message(params, getEmailStrings(locale), locale);
      for (const line of lines(message)) {
        expect(line).not.toMatch(/\{\w+\}/);
        expect(line).not.toMatch(/\b(null|undefined)\b/);
      }
      expect(message.body).not.toBe(
        kind.message(
          { ...params, bothWays: false },
          getEmailStrings(locale),
          locale,
        ).body,
      );
    }
  });
});

describe("the variants of a request message", () => {
  const kindOf = (event: EventType) =>
    kinds.find((kind) => kind.event === event)!;

  it.each([
    "rideRequest.submitted",
    "rideRequest.scheduled",
    "rideRequest.withdrawn",
  ] as EventType[])("each word %s their own way", async (event) => {
    const bodies = (await messagesOf(kindOf(event), "en")).map(
      (message) => message.body,
    );
    expect(bodies.length).toBeGreaterThan(1);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it("leave the note out of a decline that gave no reason", async () => {
    expect(
      (await messagesOf(kindOf("rideRequest.declined"), "en")).map(
        (message) => message.note?.text ?? null,
      ),
    ).toEqual(["No pilot is free that morning.", null]);
  });
});

describe("the templates the history feed has to label", () => {
  const collect = async () => {
    const templates = new Set<string>();
    for (const kind of kinds)
      for (const { template } of await messagesOf(kind, "en"))
        if (template) templates.add(template);
    return [...templates].sort();
  };

  it("are exactly these", async () => {
    expect(await collect()).toEqual([
      "adminInvite",
      "applicationSubmitted",
      "approval",
      "careDecided",
      "careInvited",
      "careLinked",
      "careRequested",
      "countryAdminAppointed",
      "countryAdminRemoved",
      "damageReported",
      "invite",
      "memberJoined",
      "pilotReminder",
      "poolAccessDecided",
      "poolAccessRequested",
      "rejection",
      "rideAnnounced",
      "rideAssigned",
      "rideBooked",
      "rideBookingCancelled",
      "rideCancelled",
      "rideChanged",
      "rideNoDemand",
      "rideOpened",
      "ridePilotFound",
      "ridePilotWithdrew",
      "rideReminder",
      "rideRequestDeclined",
      "rideRequestScheduled",
      "rideRequestSubmitted",
      "rideRequestWithdrawn",
      "rideRosterRefilled",
      "rideSignedUp",
      "rideUnderstaffed",
      "riderHandedAway",
      "riderHandedOver",
      "roleChanged",
      "superadminRemoved",
      "welcome",
    ]);
  });

  it.each(locales)("all have a label in %s", async (locale) => {
    const labels = DICTIONARIES[locale].admin.history.templates;
    for (const template of await collect()) {
      expect(Object.keys(labels)).toContain(template);
    }
  });
});

describe("the welcome for a caretaker", () => {
  it.each(locales)("reads as finished prose in %s", async (locale) => {
    const kind = kinds.find((k) => k.event === "user.onboarded")!;
    const params = kind.payload.parse({
      chapterName: "München",
      role: "passenger",
      welcomeNote: null,
      caretaker: true,
    });
    const message = kind.message(params, getEmailStrings(locale), locale);
    const passenger = kind.message(
      { ...params, caretaker: false },
      getEmailStrings(locale),
      locale,
    );

    expect(message.heading).not.toBe(passenger.heading);
    for (const line of lines(message)) {
      expect(line).not.toMatch(/\{\w+\}/);
      expect(line.trim()).not.toBe("");
    }
  });
});

describe("the copy for a name nobody has filled in yet", () => {
  it.each([
    ["pilotApplication.submitted", "Someone has asked to pilot"],
    ["chapter.memberJoined", "Someone is now a passenger"],
  ] as [EventType, string][])(
    "calls the person Someone in %s",
    async (event, expected) => {
      unknown();
      const kind = kinds.find((k) => k.event === event)!;
      const params = kind.payload.parse(await kind.params(EVENTS[event]));

      expect(kind.message(params, getEmailStrings("en"), "en").body).toContain(
        expected,
      );
    },
  );
});

describe("the pilots' reminder", () => {
  it.each(locales)("lists where each trishaw waits in %s", async (locale) => {
    const kind = kinds.find((k) => k.event === "ride.volunteerReminderDue")!;
    const params = kind.payload.parse(
      await kind.params(EVENTS["ride.volunteerReminderDue"]),
    );
    const message = kind.message(params, getEmailStrings(locale), locale);
    expect(message.steps?.items).toHaveLength(2);
    expect(message.steps?.items[0]).toContain(
      "Depot Sonnenhof, Sonnenstraße 1",
    );
    expect(message.steps?.items[1]).toContain("Isarwind");
    expect(JSON.stringify(message)).not.toContain("4711");
  });
});

describe("the last seat given up", () => {
  it.each(locales)("reads differently in %s", async (locale) => {
    const kind = kinds.find((k) => k.event === "ride.riderRemoved")!;
    const event = EVENTS["ride.riderRemoved"];
    const message = async (rosterNowEmpty: boolean) =>
      kind.message(
        kind.payload.parse(
          await kind.params({ ...event, rosterNowEmpty } as DomainEvent),
        ),
        getEmailStrings(locale),
        locale,
      );
    expect((await message(true)).heading).not.toBe(
      (await message(false)).heading,
    );
  });

  // An admin took the last rider off: nobody "gave up" a seat.
  it.each(locales)("says the rider was taken off in %s", async (locale) => {
    const kind = kinds.find((k) => k.event === "ride.riderRemoved")!;
    const params = kind.payload.parse(
      await kind.params({
        ...EVENTS["ride.riderRemoved"],
        self: false,
        rosterNowEmpty: true,
      } as DomainEvent),
    );
    const removed = kind.message(params, getEmailStrings(locale), locale);
    const gaveUp = kind.message(
      { ...params, self: true },
      getEmailStrings(locale),
      locale,
    );
    expect(removed.body).toBe(
      kind.message(
        { ...params, bothWays: true },
        getEmailStrings(locale),
        locale,
      ).body,
    );
    expect(removed.body).not.toBe(gaveUp.body);
  });
});
