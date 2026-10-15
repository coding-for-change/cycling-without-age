import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { blockExternalLinks, scrollBy } from "../../lib/mobile";

const ride = "/passenger/rides/cmv8pjyv4001m3hfn85zt9xrt";

test("rider-my-ride", async ({ record }) => {
  const page = await record({
    slug: "rider-my-ride",
    account: "passenger",
    warm: [
      "/passenger",
      "/passenger/rides",
      ride,
      "/passenger/chat",
      "/passenger/chat/cmv8q3kjb00453hjh6kfqq4fm",
    ],
  });
  await blockExternalLinks(page);
  await page.goto("/passenger");
  await expect(page.getByRole("heading", { name: "Hi Peter" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await tap(
    page,
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "My rides" }),
    1000,
  );
  await expect(
    page.getByRole("heading", { name: "My rides", level: 1 }),
  ).toBeVisible();
  await pause(page, 1000);
  await tap(page, page.locator(`main a[href="${ride}"]`).first(), 1000);
  await expect(page.getByRole("heading", { name: "Your pilot" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
  await tap(page, page.getByRole("link", { name: "Open in maps" }), 1200);
  await scrollBy(page, 260, 1000);
  await tap(page, page.getByRole("link", { name: "Call Piet Pilot" }), 1500);
  await tap(
    page,
    page.getByRole("link", { name: "Message everyone on this ride" }),
    1200,
  );
  await page.waitForURL(/\/passenger\/chat\//);
  await page.waitForLoadState("networkidle");
  await pause(page, 2500);
});
