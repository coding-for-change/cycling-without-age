import { changeMemberRole, SELF_CHANGE } from "./change-member-role";
import { membership } from "@/features/membership";
import { activity } from "@/features/activity";

jest.mock("@/features/membership", () => ({
  membership: {
    promoteToChapterAdmin: jest.fn(),
    revokeChapterRole: jest.fn(),
    removeFromChapter: jest.fn(),
  },
}));
jest.mock("@/features/activity", () => ({
  activity: { record: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: {} }));

describe("changeMemberRole", () => {
  it("refuses to demote or remove the acting admin themselves", async () => {
    for (const change of ["demote", "remove"] as const) {
      await expect(
        changeMemberRole({
          userId: "u1",
          chapterId: "c1",
          actorUserId: "u1",
          change,
        }),
      ).rejects.toThrow(SELF_CHANGE);
    }
    expect(membership.revokeChapterRole).not.toHaveBeenCalled();
    expect(membership.removeFromChapter).not.toHaveBeenCalled();
    expect(activity.record).not.toHaveBeenCalled();
  });

  it("demotes someone else and records it", async () => {
    await changeMemberRole({
      userId: "u2",
      chapterId: "c1",
      actorUserId: "u1",
      change: "demote",
    });
    expect(membership.revokeChapterRole).toHaveBeenCalledWith(
      "u2",
      "c1",
      "admin",
    );
    expect(activity.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u2",
        actorUserId: "u1",
        type: "roleRevoked",
      }),
    );
  });
});
