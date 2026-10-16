import { passengers } from "@/features/passengers";
import { profile } from "@/features/profile";
import { oncePerHandOver, withHandOverNames } from "./hand-over-names";

jest.mock("@/features/passengers", () => ({
  passengers: { passengerNames: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfiles: jest.fn() },
}));

const line = (id: string, direction: string) => ({
  id,
  type: "riderHandedOver" as const,
  actorUserId: "user-admin",
  actor: null,
  passengerId: "managed-greta",
  payload: { fromUserId: "user-old", toUserId: "user-new", direction },
  createdAt: new Date("2026-10-16T08:00:00Z"),
});

const approval = {
  id: "event-3",
  type: "applicationApproved" as const,
  actorUserId: "user-admin",
  actor: null,
  passengerId: null,
  payload: {},
  createdAt: new Date("2026-10-16T07:00:00Z"),
};

describe("a hand-over in a shared history", () => {
  it("is told once, from the side it left", () => {
    expect(
      oncePerHandOver([
        line("event-1", "in"),
        line("event-2", "out"),
        approval,
      ]),
    ).toEqual([line("event-2", "out"), approval]);
  });

  it("names the rider and both managers as the history is read", async () => {
    (passengers.passengerNames as jest.Mock).mockResolvedValue({
      "managed-greta": "Greta Huber",
    });
    (profile.getProfiles as jest.Mock).mockResolvedValue([
      { id: "user-new", name: "Lena Huber" },
    ]);

    const [named] = await withHandOverNames([line("event-2", "out")], "Gone");

    expect(named.payload).toMatchObject({
      rider: "Greta Huber",
      previous: "Gone",
      next: "Lena Huber",
    });
  });
});
