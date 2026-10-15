import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import type { EventOf } from "@/lib/events/catalog";
import { userOnboarded } from "@/use-cases/notifications/kinds/user-onboarded";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getSettings: jest.fn() },
}));

jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/features/passengers", () => ({
  passengers: { getOwnPassenger: jest.fn() },
}));

const getChapter = chapters.getChapter as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getOwnPassenger = passengers.getOwnPassenger as jest.Mock;
const getSettings = chapters.getSettings as jest.Mock;

const NOTE = "Wir treffen uns samstags um zehn am Haupteingang.";

const event = (
  chapterId: string | null = "chapter-muenchen",
  role: "pilot" | "passenger" = "pilot",
): EventOf<"user.onboarded"> => ({
  type: "user.onboarded",
  userId: "user-pernille",
  chapterId,
  role,
});

const render = async (
  locale: "en" | "da" | "de" = "de",
  role: "pilot" | "passenger" = "pilot",
) => {
  const params = userOnboarded.payload.parse(
    await userOnboarded.params(event(undefined, role)),
  );
  return userOnboarded.message(params, getEmailStrings(locale), locale);
};

beforeEach(() => {
  jest.clearAllMocks();
  getChapter.mockResolvedValue({ name: "München" });
  getProfile.mockResolvedValue({ managesOthers: false });
  getOwnPassenger.mockResolvedValue({ id: "passenger-pernille" });
  getSettings.mockResolvedValue({
    ...DEFAULT_CHAPTER_SETTINGS,
    welcomeNote: NOTE,
  });
});

describe("the welcome notification", () => {
  it("carries the chapter's own few lines into the payload", async () => {
    expect(await userOnboarded.params(event())).toEqual({
      chapterName: "München",
      role: "pilot",
      welcomeNote: NOTE,
      caretaker: false,
    });
  });

  it.each([
    ["en", "A note from München"],
    ["de", "Ein paar Zeilen von München"],
    ["da", "En hilsen fra München"],
  ] as const)(
    "heads the note in the reader's language (%s)",
    async (locale, heading) => {
      expect((await render(locale)).note).toEqual({ heading, text: NOTE });
    },
  );

  it("leaves the note out when the chapter wrote none", async () => {
    getSettings.mockResolvedValue(DEFAULT_CHAPTER_SETTINGS);

    expect((await render()).note).toBeNull();
  });

  it("still parses a payload stored before notes existed", () => {
    expect(
      userOnboarded.payload.parse({ chapterName: "München", role: "pilot" }),
    ).toEqual({
      chapterName: "München",
      role: "pilot",
      welcomeNote: null,
      caretaker: false,
    });
  });

  it("asks no chapter about someone who joined none", async () => {
    expect(await userOnboarded.params(event(null))).toEqual({
      chapterName: null,
      role: "pilot",
      welcomeNote: null,
      caretaker: false,
    });
    expect(getSettings).not.toHaveBeenCalled();
  });
});

describe("the welcome for someone who books for others", () => {
  it("speaks to a caretaker who does not ride themself", async () => {
    getProfile.mockResolvedValue({ managesOthers: true });
    getOwnPassenger.mockResolvedValue(null);

    const message = await render("en", "passenger");

    expect(message.cta).toBe("Book their first ride");
    expect(message.steps?.items.join(" ")).not.toMatch(/\byou sit\b/i);
  });

  it("keeps the rider's own welcome for a caretaker who also rides", async () => {
    getProfile.mockResolvedValue({ managesOthers: true });

    const message = await render("en", "passenger");

    expect(message.cta).toBe("Request your first ride");
  });

  it("never asks a pilot's welcome who they look after", async () => {
    await userOnboarded.params(event());

    expect(getProfile).not.toHaveBeenCalled();
  });
});
