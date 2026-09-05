import { readFileSync } from "node:fs";
import { join } from "node:path";

// ponytail: asserts the configuration, not a live `authorize()` call —
// better-auth is ESM-only and jest on node 20 cannot require it. Upgrade path:
// let better-auth through `transformIgnorePatterns` in jest.config.mjs, then
// import { organizationRoles } and assert `role.authorize({ member: ["delete"] })`
// is denied for each role.
const source = readFileSync(join(__dirname, "auth.ts"), "utf8");

const orgAccessImport = source.match(
  /import\s+\{([^}]*)\}\s+from\s+"better-auth\/plugins\/organization\/access"/,
);
const rolesMap = source.match(/organizationRoles = \{([^}]*)\}/);

describe("organization plugin access control", () => {
  it("takes only the member access control from the org plugin", () => {
    expect(orgAccessImport).not.toBeNull();
    expect(orgAccessImport![1]).toContain("memberAc");
    expect(orgAccessImport![1]).not.toContain("adminAc");
    expect(orgAccessImport![1]).not.toContain("ownerAc");
  });

  // memberAc's organization/member/invitation statements are empty, so every
  // /api/auth/organization/* mutation is denied and role changes can only
  // happen through membership's withRoles.
  it("maps every chapter role to it, with no privileged role left over", () => {
    expect(rolesMap).not.toBeNull();
    const alias =
      orgAccessImport![1].match(/memberAc\s+as\s+(\w+)/)?.[1] ?? "memberAc";
    const entries = rolesMap![1]
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    expect(entries.sort()).toEqual([
      `admin: ${alias}`,
      `passenger: ${alias}`,
      `pilot: ${alias}`,
    ]);
  });
});
