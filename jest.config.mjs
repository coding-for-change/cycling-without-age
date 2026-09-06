import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  testEnvironment: "node",
  // `.claude/worktrees/*` holds sibling git worktrees whose test copies resolve
  // `@/*` back to this src, so their module mocks never apply.
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.claude/"],
  // SWC rewrites `@/` in imports but not in jest.mock() specifiers.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});
