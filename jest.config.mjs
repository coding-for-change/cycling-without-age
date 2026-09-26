import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const ESM_PACKAGES = ["intl-messageformat", "@formatjs"];

const nextJestConfig = createJestConfig({
  testEnvironment: "node",
  // `.claude/worktrees/*` holds sibling git worktrees whose test copies resolve
  // `@/*` back to this src, so their module mocks never apply.
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.claude/"],
  // SWC rewrites `@/` in imports but not in jest.mock() specifiers.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});

export default async () => {
  const config = await nextJestConfig();
  return {
    ...config,
    transformIgnorePatterns: [
      `/node_modules/(?!(${ESM_PACKAGES.join("|")})/)`,
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};
