import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { rides } from "@/features/rides";
import { resolveReportRange } from "./report-range";
import { reportScope } from "./report-zones";

jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn(async () => []) },
}));

const queryRaw = prisma.$queryRaw as unknown as jest.Mock;
const scope = reportScope(
  [{ id: "muc", timeZone: "Europe/Berlin" }],
  resolveReportRange({ range: "7d" }, { today: "2026-10-04" }),
  new Date("2026-10-04T12:00:00Z"),
);
const sql = () =>
  queryRaw.mock.calls.map(([strings, ...values]) =>
    Prisma.sql(strings, ...values).sql.replace(/\s+/g, " "),
  );

beforeEach(() => jest.clearAllMocks());

/**
 * Who rode is what the roster says once it closes: a seat given up never
 * rode, a no-show never came, and a walk-up rode without a rider record.
 */
describe("what the reports count as ridden", () => {
  const rode = "attendance NOT IN ('cancelled', 'noShow')";

  it("counts the riders on a trip without the seats given up or never used", async () => {
    await rides.activityFacts(scope, { extras: true });
    const [buckets, chapters, riders] = sql();
    for (const query of [buckets, chapters, riders])
      expect(query).toContain(`e.${rode}`);
    expect(riders).toContain("e.passengerId IS NOT NULL");
    expect(riders).toContain(`e2.${rode}`);
    expect(buckets).not.toContain("e.passengerId IS NOT NULL");
  });

  it("tallies pilots who came and riders with a record", async () => {
    await rides.peopleTallies(scope);
    const [pilots, riders] = sql();
    expect(pilots).toContain("a.attendance <> 'noShow'");
    expect(riders).toContain("e.passengerId IS NOT NULL");
    expect(riders).toContain(`e.${rode}`);
  });

  it("measures activity by who came", async () => {
    await rides.activeParticipants(
      ["muc"],
      new Date("2025-10-04T00:00:00Z"),
      new Date("2026-10-04T00:00:00Z"),
    );
    const [pilots, riders] = sql();
    expect(pilots).toContain("a.attendance <> 'noShow'");
    expect(riders).toContain(`e.${rode}`);
  });
});
