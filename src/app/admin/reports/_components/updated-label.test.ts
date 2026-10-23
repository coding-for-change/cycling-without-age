import da from "@/messages/app/da.json";
import de from "@/messages/app/de.json";
import en from "@/messages/app/en.json";
import { updatedLabel } from "./updated-label";

const generatedAt = "2026-10-22T22:30:00.000Z";
const threeMinutesLater = new Date("2026-10-22T22:33:00.000Z");

describe("updatedLabel", () => {
  it("says how long ago the report was built, with no clock or zone", () => {
    const label = updatedLabel(
      en.admin.reports.filters.updated,
      generatedAt,
      "en",
      threeMinutesLater,
    );
    expect(label).toMatch(/^Updated 3\s?min\.? ago$/);
    expect(label).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("speaks German and Danish", () => {
    expect(
      updatedLabel(
        de.admin.reports.filters.updated,
        generatedAt,
        "de",
        threeMinutesLater,
      ),
    ).toMatch(/^Aktualisiert vor 3 Min\.$/);
    expect(
      updatedLabel(
        da.admin.reports.filters.updated,
        generatedAt,
        "da",
        threeMinutesLater,
      ),
    ).toMatch(/^Opdateret (for )?3 min\. siden$/);
  });

  it("reads a fresh report as just now", () => {
    expect(
      updatedLabel(
        en.admin.reports.filters.updated,
        generatedAt,
        "en",
        new Date(generatedAt),
      ),
    ).toBe("Updated now");
  });
});
