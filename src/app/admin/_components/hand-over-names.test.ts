import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { withHandOverNames } from "./hand-over-names";

jest.mock("@/features/passengers", () => ({
  passengers: { passengerNames: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfiles: jest.fn() },
}));

const line = {
  id: "event-1",
  type: "riderHandedOver" as const,
  actorUserId: "user-admin",
  actor: null,
  passengerId: "managed-greta",
  payload: { fromUserId: "user-old", toUserId: "user-new", direction: "out" },
  createdAt: new Date("2026-10-16T08:00:00Z"),
};

describe("a hand-over line", () => {
  it("names the rider and both managers as the history is read", async () => {
    (passengers.passengerNames as jest.Mock).mockResolvedValue({
      "managed-greta": "Greta Huber",
    });
    (profile.getProfiles as jest.Mock).mockResolvedValue([
      { id: "user-new", name: "Lena Huber" },
    ]);

    const [named] = await withHandOverNames([line], "Gone");

    expect(named.payload).toMatchObject({
      rider: "Greta Huber",
      previous: "Gone",
      next: "Lena Huber",
    });
  });
});
