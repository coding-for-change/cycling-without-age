import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { waitForSendSlot } from "../../lib/mobile";
import { enterEmailAndCode } from "../../lib/visible-sign-in";

test("pilot-sign-in", async ({ record }) => {
  await waitForSendSlot();
  const page = await record({
    slug: "pilot-sign-in",
    account: null,
    warm: ["/welcome", "/sign-in", "/sign-in/code"],
  });
  await page.goto("/welcome");
  await expect(
    page.getByRole("heading", { name: /Come along for the ride/ }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 2200);
  await tap(page, page.getByRole("link", { name: /^Sign in/ }), 800);
  await enterEmailAndCode(page, "pilot@cwa.local");
  await page.waitForURL((url) => url.pathname === "/pilot", {
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: "Hi Piet" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 2500);
});
