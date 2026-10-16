import { revalidateTag, updateTag } from "next/cache";
import {
  accessCacheTags,
  expireAccess,
  expirePasskeys,
  invalidateAccess,
} from "@/lib/cache-tags";

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
}));

const membershipsIn = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    chapterId: `chapter-${i}`,
    roles: ["passenger" as const],
  }));

beforeEach(() => jest.clearAllMocks());

describe("accessCacheTags", () => {
  it("tags an entry by its user and every chapter and country behind it", () => {
    expect(
      accessCacheTags("dana", {
        memberships: membershipsIn(1),
        countryAdminOf: ["country-de"],
      }),
    ).toEqual([
      "access:dana",
      "access:chapter:chapter-0",
      "access:country:country-de",
    ]);
  });

  it("falls back to the wide tag when the scope tags would not fit", () => {
    expect(
      accessCacheTags("eve", {
        memberships: membershipsIn(200),
        countryAdminOf: [],
      }),
    ).toEqual(["access:eve", "access:wide"]);
  });
});

describe("invalidateAccess", () => {
  it("expires each named user once and skips empty ids", () => {
    invalidateAccess({ userIds: ["anna", "anna", null, undefined] });
    expect((updateTag as jest.Mock).mock.calls).toEqual([["access:anna"]]);
  });

  it("expires the chapter, the country and the wide tag on a cascade", () => {
    invalidateAccess({ chapterIds: ["berlin"], countryIds: ["de"] });
    expect((updateTag as jest.Mock).mock.calls.flat()).toEqual([
      "access:wide",
      "access:chapter:berlin",
      "access:country:de",
    ]);
  });
});

describe("outside a Server Action", () => {
  it("expires access and passkeys immediately through revalidateTag", () => {
    expireAccess({ userIds: ["anna"], chapterIds: ["berlin"] });
    expirePasskeys("anna");
    expect((revalidateTag as jest.Mock).mock.calls).toEqual([
      ["access:anna", { expire: 0 }],
      ["access:wide", { expire: 0 }],
      ["access:chapter:berlin", { expire: 0 }],
      ["passkeys:anna", { expire: 0 }],
    ]);
    expect(updateTag).not.toHaveBeenCalled();
  });
});
