import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { membership } from "@/features/membership";
import { fleet } from "@/features/fleet";
import { profile } from "@/features/profile";
import da from "@/lib/i18n/da";
import de from "@/lib/i18n/de";
import en from "@/lib/i18n/en";
import { locales, type Locale } from "@/lib/i18n/locales";
import type { DomainEvent, EventType } from "@/lib/events/catalog";
import { kinds } from "@/use-cases/notifications/kinds";
import type { Message } from "@/use-cases/notifications/kinds/types";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapter: jest.fn(),
    getCountry: jest.fn(),
    getSettings: jest.fn(),
    listCountryAdmins: jest.fn(),
  },
}));
jest.mock("@/features/fleet", () => ({
  fleet: { getTrishaw: jest.fn(), getLocation: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));

const getChapter = chapters.getChapter as jest.Mock;
const getCountry = chapters.getCountry as jest.Mock;
const getSettings = chapters.getSettings as jest.Mock;
const listChapterAdmins = membership.listChapterAdmins as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getTrishaw = fleet.getTrishaw as jest.Mock;
const getLocation = fleet.getLocation as jest.Mock;
const listCountryAdmins = chapters.listCountryAdmins as jest.Mock;

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
  },
  "countryAdmin.removed": {
    type: "countryAdmin.removed",
    countryId: COUNTRY,
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
  "pool.accessDecided": {
    type: "pool.accessDecided",
    membershipId: "membership-1",
    poolId: "pool-1",
    chapterId: CHAPTER,
    actorUserId: ACTOR,
    approved: true,
    note: "Welcome aboard.",
  },
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
};

const unknown = () => {
  getChapter.mockResolvedValue(null);
  getCountry.mockResolvedValue(null);
  getProfile.mockResolvedValue(null);
  getTrishaw.mockResolvedValue(null);
  getLocation.mockResolvedValue(null);
};

beforeEach(() => {
  jest.clearAllMocks();
  listChapterAdmins.mockResolvedValue([{ userId: ACTOR }]);
  listCountryAdmins.mockResolvedValue([{ userId: ACTOR }]);
  getSettings.mockResolvedValue(DEFAULT_CHAPTER_SETTINGS);
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
      const params = kind.payload.parse(await kind.params(event));
      const message = kind.message(params, getEmailStrings(locale), locale);

      expect(lines(message).length).toBeGreaterThan(3);
      for (const line of lines(message)) {
        expect(line).not.toMatch(/\{\w+\}/);
        expect(line).not.toMatch(/\b(null|undefined)\b/);
        expect(line.trim()).not.toBe("");
      }
      expect(message.template).toEqual(expect.any(String));
    });

    it.each(locales)(
      "still reads as finished prose in %s with nothing named",
      async (locale) => {
        unknown();
        const params = kind.payload.parse(await kind.params(event));
        const message = kind.message(params, getEmailStrings(locale), locale);

        for (const line of lines(message)) {
          expect(line).not.toMatch(/\{\w+\}/);
          expect(line).not.toMatch(/\b(null|undefined)\b/);
        }
      },
    );
  },
);

describe("the templates the history feed has to label", () => {
  const collect = async () => {
    const templates = new Set<string>();
    const rejected: DomainEvent = {
      ...EVENTS["pilotApplication.decided"],
      approved: false,
    } as DomainEvent;

    for (const kind of kinds) {
      for (const event of [
        EVENTS[kind.event],
        ...(kind.event === "pilotApplication.decided" ? [rejected] : []),
      ]) {
        const params = kind.payload.parse(await kind.params(event));
        const { template } = kind.message(params, getEmailStrings("en"), "en");
        if (template) templates.add(template);
      }
    }
    return [...templates].sort();
  };

  it("are exactly these", async () => {
    expect(await collect()).toEqual([
      "applicationSubmitted",
      "approval",
      "countryAdminAppointed",
      "countryAdminRemoved",
      "damageReported",
      "invite",
      "memberJoined",
      "poolAccessDecided",
      "poolAccessRequested",
      "rejection",
      "roleChanged",
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
