import { test } from "../../lib/rec";
import { click, moveTo, pause } from "../../lib/human";

test("super-reports-across", async ({ record }) => {
  test.setTimeout(240_000);
  const page = await record({
    slug: "super-reports-across",
    account: "superadmin",
    warm: ["/admin/reports", "/admin/reports?chapter=muenchen"],
  });
  await page.goto("/admin/reports");
  const board = page.getByRole("heading", { name: "Leaderboard" });
  await board.waitFor();
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => {});
  await pause(page, 1500);

  await moveTo(page, page.getByRole("list", { name: "Key figures" }));
  await pause(page, 1200);

  await moveTo(
    page,
    page.getByRole("heading", { name: "Where the rides happened" }),
  );
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 80);
    await pause(page, 60);
  }
  await pause(page, 1800);

  await moveTo(page, board);
  await pause(page, 500);
  await click(page, page.getByRole("tab", { name: /Countries/ }), 1800);
  await click(page, page.getByRole("tab", { name: /Chapters/ }), 1300);

  await click(
    page,
    page.getByRole("link", { name: /Open München/ }).first(),
    400,
  );
  await page.waitForURL(/chapter=muenchen/);
  await page.getByRole("heading", { name: "Leaderboard" }).waitFor();
  await page
    .waitForLoadState("networkidle", { timeout: 8_000 })
    .catch(() => {});
  await pause(page, 1500);
  await moveTo(page, page.getByRole("heading", { name: "Leaderboard" }));
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -100);
    await pause(page, 60);
  }
  await pause(page, 2000);
});
