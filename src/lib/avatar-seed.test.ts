import { avatarSeed } from "@/lib/avatar-seed";

describe("avatarSeed", () => {
  it("normalises case and whitespace so the invite preview and the account agree", () => {
    expect(avatarSeed("  Anna@Example.ORG ")).toBe("anna@example.org");
    expect(avatarSeed("anna@example.org")).toBe(avatarSeed("ANNA@EXAMPLE.ORG"));
  });

  it("is empty for a blank address so the preview can show a placeholder", () => {
    expect(avatarSeed("   ")).toBe("");
  });
});
