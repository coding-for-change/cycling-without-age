import { test } from "../../lib/rec";
import { click, moveToPoint, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

test("admin-reports", async ({ record }) => {
  const page = await record({
    slug: "admin-reports",
    account: "chapterAdmin",
    warm: [
      "/admin/reports",
      "/admin/reports?range=90d",
      "/admin/reports?range=90d&metric=hours",
      "/admin/reports?metric=hours&from=2026-08-10&to=2026-08-16",
      "/admin/reports?metric=hours&from=2026-08-10&to=2026-08-16&ranking=pilots",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/reports");
  await page
    .getByRole("heading", { name: "Leaderboard" })
    .waitFor({ timeout: 30_000 });
  await settle(page);
  await pause(page, 1500);
  markStart("admin-reports", t0);
  await pause(page, 700);
  await click(page, page.getByRole("radio", { name: "Last 90 days" }), 300);
  await page.waitForURL(/range=90d/);
  await settle(page);
  await pause(page, 1800);
  await click(
    page,
    page
      .getByRole("list", { name: "Key figures" })
      .getByRole("link")
      .filter({ hasText: "Hours" }),
    300,
  );
  await page.waitForURL(/metric=hours/);
  await settle(page);
  await pause(page, 1800);
  const label = page.locator("svg text").filter({ hasText: "10 Aug" }).first();
  const box = await label.boundingBox();
  if (!box) throw new Error("no bar label");
  await moveToPoint(page, { x: box.x + box.width / 2, y: box.y - 40 });
  await pause(page, 1200);
  await page.mouse.click(box.x + box.width / 2, box.y - 40);
  await page.waitForURL(/from=2026-08-10/);
  await settle(page);
  await pause(page, 2200);
  const seeAll = page.getByRole("button", { name: "See all" });
  await seeAll.scrollIntoViewIfNeeded();
  await pause(page, 800);
  await moveTo(page, page.getByRole("heading", { name: "Leaderboard" }));
  await pause(page, 1200);
  await click(page, seeAll, 300);
  await page.getByRole("dialog", { name: "All pilots" }).waitFor();
  await settle(page);
  await pause(page, 2500);
});
