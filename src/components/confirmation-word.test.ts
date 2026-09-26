import { confirmationWord, matchesConfirmationWord } from "./confirmation-word";

describe("confirmationWord", () => {
  it("scopes the word to the record", () => {
    expect(confirmationWord("DELETE", "Germany")).toBe("DELETE-GERMANY");
  });

  it("joins words with hyphens and drops accents", () => {
    expect(confirmationWord("DELETE", "Radeln ohne Alter München")).toBe(
      "DELETE-RADELN-OHNE-ALTER-MUNCHEN",
    );
  });

  it("caps long names at a word boundary", () => {
    expect(
      confirmationWord(
        "DELETE",
        "Cycling Without Age Copenhagen North and Frederiksberg",
      ),
    ).toBe("DELETE-CYCLING-WITHOUT-AGE-COPENHAGEN-NORTH-AND");
  });

  it("falls back to the bare word for a name without letters", () => {
    expect(confirmationWord("DELETE", "—")).toBe("DELETE");
  });
});

describe("matchesConfirmationWord", () => {
  const word = confirmationWord("DELETE", "München");

  it("accepts the word typed in any case or with the accent", () => {
    expect(matchesConfirmationWord("delete-münchen", word)).toBe(true);
    expect(matchesConfirmationWord(" DELETE-MUNCHEN ", word)).toBe(true);
  });

  it("refuses the bare word", () => {
    expect(matchesConfirmationWord("DELETE", word)).toBe(false);
  });
});
