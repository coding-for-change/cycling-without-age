import en from "@/messages/app/en.json";
import da from "@/messages/app/da.json";
import de from "@/messages/app/de.json";
import { StaticText, maskUnlessStatic } from "./replay-mask";

const staticText = new StaticText().add(en).add(da).add(de);
const maskFn = maskUnlessStatic(staticText);

const inside = (matches: boolean) =>
  ({ closest: () => (matches ? {} : null) }) as unknown as Element;

describe("replay text masking", () => {
  it("shows translated copy as it is", () => {
    expect(maskFn("Page not found")).toBe("Page not found");
    expect(maskFn("  Return home\n")).toBe("  Return home\n");
    expect(maskFn(de.notFound.title)).toBe(de.notFound.title);
  });

  it("masks everything that is not translated copy", () => {
    expect(maskFn("Anna Jensen")).toBe("**** ******");
    expect(maskFn("Nørrebrogade 12")).toBe("************ **");
  });

  it("shows templates whose placeholders are filled with numbers", () => {
    expect(maskFn("Step 2 of 5")).toBe("Step 2 of 5");
    expect(maskFn("1,201–1,250 of 12,480")).toBe("1,201–1,250 of 12,480");
    expect(maskFn("Type DELETE to confirm")).toBe("Type DELETE to confirm");
  });

  it("shows every branch of a plural message", () => {
    expect(maskFn("1 seat")).toBe("1 seat");
    expect(maskFn("12 seats")).toBe("12 seats");
    expect(maskFn("3 Sitzplätze")).toBe("3 Sitzplätze");
    expect(maskFn("No trishaws use it")).toBe("No trishaws use it");
    expect(maskFn("1.250 rickshawer bruger den")).toBe(
      "1.250 rickshawer bruger den",
    );
  });

  it("masks a plural branch whose number is replaced by words", () => {
    expect(maskFn("many seats")).toBe("**** *****");
  });

  it("masks templates whose placeholders carry personal data", () => {
    expect(maskFn("Step two of 5")).toBe("**** *** ** *");
    expect(
      maskFn("We emailed a 6-digit code to anna@example.dk."),
    ).not.toContain("anna");
    expect(maskFn("Overlaps with Frederiksberg, 2 km away.")).not.toContain(
      "Frederiksberg",
    );
  });

  it("shows the static fragments around a placeholder rendered on its own", () => {
    expect(maskFn("See the")).toBe("See the");
  });

  it("masks sample names and addresses from input placeholders", () => {
    expect(maskFn("Anna Jensen")).toBe("**** ******");
    expect(maskFn("anna@example.org")).toBe("****************");
    expect(maskFn("Work laptop")).toBe("**** ******");
  });

  it("always masks what a user typed, even when it matches copy", () => {
    expect(maskFn("Return home", inside(true))).toBe("****** ****");
    expect(maskFn("Return home", inside(false))).toBe("Return home");
  });
});
