import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import type { EventOf } from "@/lib/events/catalog";
import { memberInvited } from "@/use-cases/notifications/kinds/member-invited";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));

const getChapter = chapters.getChapter as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;

const event = (
  roles: ("admin" | "pilot")[] = ["pilot"],
): EventOf<"member.invited"> => ({
  type: "member.invited",
  chapterId: "chapter-muenchen",
  userId: "user-new",
  actorUserId: "user-anke",
  roles,
});

const render = async (
  roles: ("admin" | "pilot")[] = ["pilot"],
  locale: "en" | "da" | "de" = "de",
) => {
  const kind = memberInvited;
  const params = kind.payload.parse(await kind.params(event(roles)));
  return kind.message(params, getEmailStrings(locale), locale);
};

beforeEach(() => {
  jest.clearAllMocks();
  getChapter.mockResolvedValue({ name: "München" });
  getProfile.mockResolvedValue({ name: "Anke" });
});

describe("the invitation notification", () => {
  it("reaches the invitee alone", async () => {
    expect(await memberInvited.recipients(event())).toEqual(["user-new"]);
  });

  it("names the inviter, the chapter and the role", async () => {
    expect((await render()).body).toBe(
      "Anke hat dich als Pilot zu München eingeladen.",
    );
  });

  // Both roles at once: the mail names them in one sentence and lands the
  // invitee on the admin side, the more capable of the two.
  it("names both roles in one sentence, in the reader's language", async () => {
    expect((await render(["pilot", "admin"])).body).toContain(
      "Pilot und Ortsgruppen-Admin",
    );
    expect((await render(["pilot", "admin"], "en")).body).toContain(
      "a pilot and a chapter admin",
    );
  });

  it("sends the invitee to the side their roles unlock", async () => {
    expect(memberInvited.href(event(["pilot"]))).toBe("/sign-in?next=%2Fpilot");
    expect(memberInvited.href(event(["pilot", "admin"]))).toBe(
      "/sign-in?next=%2Fadmin",
    );
  });

  it("keeps the sign-in hint as the one numbered step", async () => {
    expect((await render()).steps).toEqual({
      items: [getEmailStrings("de").invite.how],
    });
  });

  it("writes in whatever language the mail is rendered in", async () => {
    expect((await render(["pilot"], "en")).subject).toBe(
      "You've been invited to München",
    );
  });
});
