import { activity } from "@/lib/activity";
import type { DomainEvent } from "@/lib/events/catalog";
import type { RecordEventInput } from "@/lib/activity";
import { recordActivity } from "@/worker/listeners/record-activity";

jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));

const record = activity.record as jest.Mock;

const CHAPTER = "chapter-muenchen";
const COUNTRY = "country-de";
const SUBJECT = "user-pernille";
const ACTOR = "user-anke";

const run = (event: DomainEvent) => recordActivity({ id: "event-1", event });

beforeEach(() => jest.clearAllMocks());

describe("recordActivity", () => {
  it.each<[string, DomainEvent, RecordEventInput]>([
    [
      "an approval",
      {
        type: "pilotApplication.decided",
        applicationId: "app-1",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: ACTOR,
        approved: true,
        note: null,
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "applicationApproved",
      },
    ],
    [
      "a rejection with its note",
      {
        type: "pilotApplication.decided",
        applicationId: "app-1",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: ACTOR,
        approved: false,
        note: "Not this season.",
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "applicationRejected",
        payload: { note: "Not this season." },
      },
    ],
    [
      "an application",
      {
        type: "pilotApplication.submitted",
        applicationId: "app-1",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: SUBJECT,
      },
      {
        userId: SUBJECT,
        actorUserId: SUBJECT,
        chapterId: CHAPTER,
        type: "applicationSubmitted",
      },
    ],
    [
      "an invitation",
      {
        type: "member.invited",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: ACTOR,
        roles: ["pilot", "admin"],
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "invited",
        payload: { roles: "pilot,admin" },
      },
    ],
    [
      "a promotion",
      {
        type: "member.roleChanged",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: ACTOR,
        change: "promote",
        roles: ["pilot", "admin"],
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "roleGranted",
      },
    ],
    [
      "a demotion",
      {
        type: "member.roleChanged",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: ACTOR,
        change: "demote",
        roles: ["pilot"],
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "roleRevoked",
      },
    ],
    [
      "a removal",
      {
        type: "member.roleChanged",
        chapterId: CHAPTER,
        userId: SUBJECT,
        actorUserId: ACTOR,
        change: "remove",
        roles: [],
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        chapterId: CHAPTER,
        type: "memberRemoved",
      },
    ],
    [
      "a country admin appointment",
      {
        type: "countryAdmin.appointed",
        countryId: COUNTRY,
        userId: SUBJECT,
        actorUserId: ACTOR,
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        type: "countryAdminAppointed",
      },
    ],
    [
      "a country admin removal",
      {
        type: "countryAdmin.removed",
        countryId: COUNTRY,
        userId: SUBJECT,
        actorUserId: ACTOR,
      },
      {
        userId: SUBJECT,
        actorUserId: ACTOR,
        type: "countryAdminRemoved",
      },
    ],
  ])("records %s", async (_name, event, expected) => {
    await run(event);
    expect(record).toHaveBeenCalledWith(expected);
  });

  // These two live in the bell only; a history line would repeat what the
  // membership row already says.
  it.each(["user.onboarded", "chapter.memberJoined"])(
    "refuses %s, which has no history line",
    async (type) => {
      await expect(
        run({ type, userId: SUBJECT, chapterId: CHAPTER } as never),
      ).rejects.toThrow(`no builder for ${type}`);
      expect(record).not.toHaveBeenCalled();
    },
  );
});
