import { test } from "../../lib/rec";
import { click, pause, moveTo } from "../../lib/human";
import { markStart, pressUntil, settle } from "../../lib/wait";

test("admin-command-bar", async ({ record }) => {
  const page = await record({
    slug: "admin-command-bar",
    account: "chapterAdmin",
    warm: [
      "/admin/rides",
      "/admin/trishaws?new=1",
      "/admin/trishaws",
      "/admin/members",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-command-bar", t0);
  await moveTo(page, page.getByText(/for anything/));
  await pause(page, 1200);
  const input = page.locator("[cmdk-input]");
  await pressUntil(page, "Meta+k", input);
  await pause(page, 900);
  await input.pressSequentially("trishaw", { delay: 110 });
  await pause(page, 1200);
  const item = page
    .locator("[cmdk-item]")
    .filter({ hasText: "Add a trishaw" })
    .first();
  await moveTo(page, page.locator("[cmdk-item]").first());
  await pause(page, 500);
  await click(page, item, 600);
  await page.getByRole("dialog").waitFor();
  await settle(page);
  await pause(page, 2000);
  await page.keyboard.press("Escape");
  await pause(page, 900);
  await pressUntil(page, "Meta+k", input);
  await pause(page, 600);
  await input.pressSequentially("members", { delay: 120 });
  await pause(page, 900);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/admin\/members/);
  await settle(page);
  await pause(page, 1800);
});
