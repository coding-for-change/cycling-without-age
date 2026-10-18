import { PROBLEM_EMAIL, problemMailto } from "./support";

it("writes to the reserved placeholder address, subject and body encoded", () => {
  expect(PROBLEM_EMAIL.endsWith(".example")).toBe(true);
  expect(problemMailto("Problem in der App", "Was ist passiert?\nWo?")).toBe(
    "mailto:problem@cwa.example?subject=Problem%20in%20der%20App&body=Was%20ist%20passiert%3F%0AWo%3F",
  );
});
