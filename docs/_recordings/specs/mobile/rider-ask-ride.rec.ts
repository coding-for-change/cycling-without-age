import { devices } from "@playwright/test";
import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { waitForSendSlot } from "../../lib/mobile";
import { enterEmailAndCode } from "../../lib/visible-sign-in";

const email = process.env.DOCS_RIDER_EMAIL ?? "new.rider.docs@cwa.local";

test("rider-ask-ride", async ({ record, browser, baseURL }) => {
  await waitForSendSlot();
  const auth = await browser.newContext({ ...devices["iPhone 14"], baseURL });
  const authPage = await auth.newPage();
  await authPage.goto("/sign-in");
  await enterEmailAndCode(authPage, email);
  await authPage.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 30_000,
  });
  for (const url of ["/passenger", "/passenger/rides"]) {
    await authPage.goto(url);
    await authPage.waitForLoadState("networkidle").catch(() => {});
  }
  const { cookies } = await auth.storageState();
  await auth.close();
  const page = await record({ slug: "rider-ask-ride", account: null });
  await page.context().addCookies(cookies);
  await page.goto("/passenger");
  await expect(page.getByRole("heading", { name: /Hi Rosa/ })).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 2000);
  await tap(page, page.getByRole("link", { name: /^Book a ride/ }), 1000);
  await page.waitForURL(/\/passenger\/rides/);
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 1500);
  await page
    .getByText(/Nothing booked yet|Ask .* for a ride|No rides planned/)
    .first()
    .scrollIntoViewIfNeeded();
  await pause(page, 3500);
});
