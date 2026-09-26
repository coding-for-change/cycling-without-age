import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { reportDamageAsPilot } from "@/use-cases/report-damage";

jest.mock("@/features/fleet", () => ({ fleet: { reportDamage: jest.fn() } }));
jest.mock("@/features/rides", () => ({
  rides: { upcomingRideIdsWithTrishaw: jest.fn() },
}));

const upcoming = rides.upcomingRideIdsWithTrishaw as jest.Mock;
const reportDamage = fleet.reportDamage as jest.Mock;

const ride = {
  id: "ride-1",
  chapterId: "chapter-muenchen",
  assignments: [{ role: "pilot", user: { id: "pilot-1" } }],
  trishaws: [{ trishaw: { id: "trishaw-1" } }],
};

const input = (over: Record<string, unknown> = {}) => ({
  trishawId: "trishaw-1",
  description: "Flat tyre",
  grounding: true,
  ...over,
});

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return null;
  } catch (error) {
    return domainCode(error);
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  upcoming.mockResolvedValue(["ride-2"]);
});

it("refuses a pilot who was not on the ride", async () => {
  expect(
    await codeOf(
      reportDamageAsPilot({ input: input(), userId: "pilot-2", ride }),
    ),
  ).toBe("notAssigned");
  expect(reportDamage).not.toHaveBeenCalled();
});

it("refuses a trishaw that was not on the ride", async () => {
  expect(
    await codeOf(
      reportDamageAsPilot({
        input: input({ trishawId: "trishaw-9" }),
        userId: "pilot-1",
        ride,
      }),
    ),
  ).toBe("trishawNotOnRide");
});

it("reports on behalf of the ride's chapter with the rides it now puts at risk", async () => {
  await reportDamageAsPilot({ input: input(), userId: "pilot-1", ride });
  expect(reportDamage).toHaveBeenCalledWith(
    expect.objectContaining({
      rideId: "ride-1",
      reportedByUserId: "pilot-1",
      chapterId: "chapter-muenchen",
      affectedRideIds: ["ride-2"],
    }),
  );
});

it("does not look up affected rides for a minor damage", async () => {
  await reportDamageAsPilot({
    input: input({ grounding: false }),
    userId: "pilot-1",
    ride,
  });
  expect(upcoming).not.toHaveBeenCalled();
});
