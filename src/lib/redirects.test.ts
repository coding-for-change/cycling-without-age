import { HOME_BY_ROLE } from "@/lib/redirects";

describe("HOME_BY_ROLE", () => {
  it("routes every role to its home", () => {
    expect(HOME_BY_ROLE.superadmin).toBe("/admin");
    expect(HOME_BY_ROLE.countryAdmin).toBe("/admin");
    expect(HOME_BY_ROLE.chapterAdmin).toBe("/admin");
    expect(HOME_BY_ROLE.pilot).toBe("/pilot");
    expect(HOME_BY_ROLE.passenger).toBe("/passenger");
  });

  it("covers every role, so no session can fall through it", () => {
    expect(Object.keys(HOME_BY_ROLE).sort()).toEqual([
      "chapterAdmin",
      "countryAdmin",
      "passenger",
      "pilot",
      "superadmin",
    ]);
  });
});
