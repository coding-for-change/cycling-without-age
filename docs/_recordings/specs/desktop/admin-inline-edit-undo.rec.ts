import { test } from "../../lib/rec";
import { click, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const RIDE = "/admin/rides/cmv8qz3pj00423hjkjonxebo5";

test("admin-inline-edit-undo", async ({ record }) => {
  const page = await record({
    slug: "admin-inline-edit-undo",
    account: "chapterAdmin",
    warm: [RIDE],
  });
  const t0 = Date.now();
  await page.goto(RIDE);
  await page
    .locator("h1")
    .filter({ hasText: "Pleasure ride" })
    .waitFor({ timeout: 30_000 });
  await settle(page, 4000);
  markStart("admin-inline-edit-undo", t0);
  await pause(page, 900);
  const note = page
    .locator("main button")
    .filter({ hasText: "Anything the pilots should know" })
    .first();
  await moveTo(page, note);
  await pause(page, 900);
  await click(page, note, 500);
  await page.keyboard.type(
    "Ring at the side door — Erna waits in the winter garden.",
    { delay: 55 },
  );
  await pause(page, 700);
  await page.keyboard.press("Meta+Enter");
  const undo = page.getByRole("button", { name: "Undo" });
  await undo.waitFor();
  await pause(page, 2000);
  await click(page, undo, 300);
  await page.getByText("Put back.").first().waitFor();
  await pause(page, 2500);
});
