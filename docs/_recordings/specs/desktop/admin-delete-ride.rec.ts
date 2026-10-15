import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const RIDE = "/admin/rides/cmv8r203a004q3hjklehdxtce";

test("admin-delete-ride", async ({ record }) => {
  const page = await record({
    slug: "admin-delete-ride",
    account: "chapterAdmin",
    warm: ["/admin/rides", RIDE],
  });
  const t0 = Date.now();
  await page.goto(RIDE);
  await page
    .getByRole("button", { name: "Delete ride" })
    .waitFor({ timeout: 30_000 });
  await settle(page, 4000);
  markStart("admin-delete-ride", t0);
  await pause(page, 900);
  await moveTo(page, page.locator("h1"));
  await pause(page, 900);
  await click(page, page.getByRole("button", { name: "Delete ride" }), 800);
  const dialog = page.getByRole("dialog").last();
  await dialog.getByRole("textbox").waitFor();
  await moveTo(page, dialog.getByRole("list"));
  await pause(page, 1500);
  await humanType(page, dialog.getByRole("textbox"), "DELETE-17-10-2026");
  await pause(page, 700);
  await click(page, dialog.getByRole("button", { name: "Delete ride" }), 300);
  await page.waitForURL(/\/admin\/rides(\?|$)/, { timeout: 30_000 });
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  await pause(page, 2500);
});
