import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  // SWC rewrites `@/` in imports but not in jest.mock() specifiers.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});
