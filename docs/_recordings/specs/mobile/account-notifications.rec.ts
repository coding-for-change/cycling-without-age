import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";

test("account-notifications", async ({ record }) => {
  const page = await record({
    slug: "account-notifications",
    account: "pilot",
    warm: ["/pilot"],
  });
  await page.goto("/pilot");
  await expect(page.getByRole("heading", { name: "Hi Piet" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await tap(page, page.getByRole("button", { name: /^Your account/ }), 1200);
  const sheet = page.getByRole("dialog", { name: /^Account/ });
  await expect(
    sheet.getByRole("heading", { name: /^Notifications/ }),
  ).toBeVisible();
  await pause(page, 1200);
  await tap(page, sheet.getByRole("button", { name: /^Language/ }), 1300);
  await page.keyboard.press("Escape");
  await pause(page, 800);
  await sheet
    .getByRole("heading", { name: /^Notifications/ })
    .scrollIntoViewIfNeeded();
  await pause(page, 1200);
  await tap(page, sheet.getByRole("switch", { name: /^Email/ }), 1300);
  await tap(page, sheet.getByRole("switch", { name: /^Push/ }), 1300);
  await tap(
    page,
    sheet.getByRole("button", { name: /^Create my calendar link/ }),
    600,
  );
  await expect(sheet.getByRole("button", { name: /^Copy link/ })).toBeVisible({
    timeout: 15_000,
  });
  await sheet
    .getByRole("button", { name: /^Copy link/ })
    .scrollIntoViewIfNeeded();
  await pause(page, 2500);
});
