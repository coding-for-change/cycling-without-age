import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const RIDE = "/admin/rides/cmv8r203a004q3hjklehdxtce";

test("admin-cancel-ride", async ({ record }) => {
  const page = await record({
    slug: "admin-cancel-ride",
    account: "chapterAdmin",
    warm: ["/admin/rides", RIDE],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-cancel-ride", t0);
  await pause(page, 900);
  await click(page, page.locator(`main a[href="${RIDE}"]`).first(), 300);
  await page
    .locator("h1")
    .filter({ hasText: "Pleasure ride" })
    .waitFor({ timeout: 30_000 });
  await pause(page, 1500);
  await click(page, page.getByRole("button", { name: "Cancel ride" }), 800);
  const dialog = page.getByRole("dialog").last();
  await dialog.getByText("Cancel this ride?").waitFor();
  const reason = dialog.getByRole("combobox", { name: "Why is it off?" });
  await moveTo(page, reason);
  await reason.selectOption({ index: 0 });
  await pause(page, 800);
  await humanType(
    page,
    dialog.getByRole("textbox", { name: "Note" }),
    "Thunderstorms forecast for the afternoon. We'll offer Erna a new date.",
  );
  await pause(page, 800);
  await click(page, dialog.getByRole("button", { name: "Cancel ride" }), 300);
  await dialog.waitFor({ state: "hidden" });
  await pause(page, 2000);
  await click(page, page.getByRole("link", { name: "All rides" }), 300);
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  await pause(page, 500);
  await moveTo(page, page.locator(`main a[href="${RIDE}"]`).first());
  await pause(page, 2200);
});
