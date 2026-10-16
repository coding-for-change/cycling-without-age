import { readLegalTextAction } from "@/features/legal/actions";
import { requestLegalText } from "./legal-text-request";

jest.mock("@/features/legal/actions", () => ({
  readLegalTextAction: jest.fn(),
}));

const readLegalText = jest.mocked(readLegalTextAction);

const privacy = {
  document: "privacy" as const,
  version: "1.0",
  updatedOn: "2026-10-15",
  draft: false,
  text: "## Who is responsible",
};

beforeEach(() => readLegalText.mockReset());

describe("requestLegalText", () => {
  it("loads a document once per language and reuses it", async () => {
    readLegalText.mockResolvedValue(privacy);

    const first = requestLegalText("privacy", "en");
    const second = requestLegalText("privacy", "en");

    expect(second).toBe(first);
    await expect(first).resolves.toEqual(privacy);
    expect(readLegalText).toHaveBeenCalledTimes(1);
  });

  it("loads again for another language", async () => {
    readLegalText.mockResolvedValue(privacy);

    await requestLegalText("terms", "en");
    await requestLegalText("terms", "de");

    expect(readLegalText).toHaveBeenCalledTimes(2);
  });

  it("resolves to null when loading fails and tries again next time", async () => {
    readLegalText.mockRejectedValueOnce(new Error("offline"));
    readLegalText.mockResolvedValueOnce(privacy);

    await expect(requestLegalText("imprint", "da")).resolves.toBeNull();
    await expect(requestLegalText("imprint", "da")).resolves.toEqual(privacy);
    expect(readLegalText).toHaveBeenCalledTimes(2);
  });
});
