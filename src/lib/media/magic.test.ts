import { looksLikeVideo } from "./magic";

const ftyp = (brand: string) =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 0x20]),
    Buffer.from(`ftyp${brand}`, "latin1"),
    Buffer.alloc(8),
  ]);

describe("looksLikeVideo", () => {
  it.each(["isom", "qt  ", "M4V "])(
    "accepts an ftyp box with brand %s",
    (brand) => {
      expect(looksLikeVideo(ftyp(brand))).toBe(true);
    },
  );

  it("accepts an EBML header", () => {
    expect(
      looksLikeVideo(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00])),
    ).toBe(true);
  });

  it.each([
    [
      "png",
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
    ],
    ["pdf", Buffer.from("%PDF-1.7 hello", "latin1")],
    ["avi", Buffer.from("RIFF\0\0\0\0AVI LIST", "latin1")],
    ["empty", Buffer.alloc(0)],
  ])("rejects %s", (_name, head) => {
    expect(looksLikeVideo(head)).toBe(false);
  });
});
