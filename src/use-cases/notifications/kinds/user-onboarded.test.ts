import { getEmailStrings } from "@/emails/strings";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";
import type { EventOf } from "@/lib/events/catalog";
import { userOnboarded } from "@/use-cases/notifications/kinds/user-onboarded";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getSettings: jest.fn() },
}));

const getChapter = chapters.getChapter as jest.Mock;
const getSettings = chapters.getSettings as jest.Mock;

const NOTE = "Wir treffen uns samstags um zehn am Haupteingang.";

const event = (
  chapterId: string | null = "chapter-muenchen",
): EventOf<"user.onboarded"> => ({
  type: "user.onboarded",
  userId: "user-pernille",
  chapterId,
  role: "pilot",
});

const render = async (locale: "en" | "da" | "de" = "de") => {
  const params = userOnboarded.payload.parse(
    await userOnboarded.params(event()),
  );
  return userOnboarded.message(params, getEmailStrings(locale), locale);
};

beforeEach(() => {
  jest.clearAllMocks();
  getChapter.mockResolvedValue({ name: "München" });
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
    ).toEqual({ chapterName: "München", role: "pilot", welcomeNote: null });
  });

  it("asks no chapter about someone who joined none", async () => {
    expect(await userOnboarded.params(event(null))).toEqual({
      chapterName: null,
      role: "pilot",
      welcomeNote: null,
    });
    expect(getSettings).not.toHaveBeenCalled();
  });
});
