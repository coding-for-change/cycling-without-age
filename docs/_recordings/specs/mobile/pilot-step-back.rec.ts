import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { scrollToBottom } from "../../lib/mobile";

const outside = "/pilot/rides/cmv8pjyvp00203hfnfxnisn77";
const inside = "/pilot/rides/cmv8pjyue00183hfns4rs71e3";

test("pilot-step-back", async ({ record }) => {
  const page = await record({
    slug: "pilot-step-back",
    account: "pilot",
    warm: ["/pilot/rides", outside, inside],
  });
  await page.goto("/pilot/rides");
  await expect(
    page.getByRole("heading", { name: "My rides", level: 1 }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await tap(page, page.locator(`main a[href="${outside}"]`).first(), 1000);
  await expect(
    page.getByRole("button", { name: "Step back from this ride" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1500);
  await scrollToBottom(page, 1200);
  await tap(
    page,
    page.getByRole("button", { name: "Step back from this ride" }),
    1500,
  );
  await tap(
    page,
    page
      .getByRole("alertdialog")
      .getByRole("button", { name: /^Step back\W*$/ }),
    300,
  );
  await expect(
    page.getByText("You've stepped back. Your chapter knows."),
  ).toBeVisible({ timeout: 15_000 });
  await pause(page, 2500);
  await page.goto("/pilot/rides");
  await page.waitForLoadState("networkidle");
  await pause(page, 1000);
  await tap(page, page.locator(`main a[href="${inside}"]`).first(), 1000);
  await expect(
    page.getByRole("heading", { name: "Picking up the trishaw" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1000);
  await scrollToBottom(page, 1500);
  await pause(page, 2500);
});
