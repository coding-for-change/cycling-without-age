import {
  DEFAULT_CHAPTER_SETTINGS,
  DEMAND_CHECK_LEAD_HOURS,
  REMINDER_LEAD_MINUTES,
  chapterInput,
  chapterSettingsInput,
  slugify,
} from "./schemas";

describe("slugify", () => {
  it.each([
    ["Aarhus Nord", "aarhus-nord"],
    ["München – Schwabing", "munchen-schwabing"],
    ["Ærøskøbing Plejehjem", "aeroskobing-plejehjem"],
    ["  Straße  ", "strasse"],
    ["---", ""],
  ])("%s → %s", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("only produces slugs the input schema accepts", () => {
    for (const name of ["Café Ålborg", "Zürich West 2", "A".repeat(80)]) {
      expect(chapterInput.shape.slug.safeParse(slugify(name)).success).toBe(
        true,
      );
    }
  });
});

describe("chapter logo", () => {
  it("takes web addresses only", () => {
    const parse = (logo: string) =>
      chapterInput.shape.logo.safeParse(logo).success;
    expect(parse("https://example.org/logo.png")).toBe(true);
    expect(parse("javascript:alert(1)")).toBe(false);
    expect(parse("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("the reminder leads", () => {
  it("takes every lead the Reminders card offers", () => {
    for (const minutes of REMINDER_LEAD_MINUTES)
      expect(
        chapterSettingsInput.safeParse({
          riderReminderLeadMinutes: minutes,
          volunteerReminderLeadMinutes: minutes,
        }).success,
      ).toBe(true);
    for (const hours of DEMAND_CHECK_LEAD_HOURS)
      expect(
        chapterSettingsInput.safeParse({ demandCheckLeadHours: hours }).success,
      ).toBe(true);
  });

  it("refuses a lead the card does not offer", () => {
    for (const value of [60, 1440.5, "1440"])
      expect(
        chapterSettingsInput.safeParse({ riderReminderLeadMinutes: value })
          .success,
      ).toBe(false);
    expect(
      chapterSettingsInput.safeParse({ demandCheckLeadHours: 72 }).success,
    ).toBe(false);
  });

  it("starts every chapter on a lead the card offers", () => {
    const { riderReminderLeadMinutes, volunteerReminderLeadMinutes } =
      DEFAULT_CHAPTER_SETTINGS;
    expect(REMINDER_LEAD_MINUTES).toContain(riderReminderLeadMinutes);
    expect(REMINDER_LEAD_MINUTES).toContain(volunteerReminderLeadMinutes);
    expect(DEMAND_CHECK_LEAD_HOURS).toContain(
      DEFAULT_CHAPTER_SETTINGS.demandCheckLeadHours,
    );
  });
});
