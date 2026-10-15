import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { blockExternalLinks, scrollBy } from "../../lib/mobile";

const ride = "/pilot/rides/cmv8pjyue00183hfns4rs71e3";
const chat = "/pilot/chat/cmv8pk7ly001h3hjhd5tpqi0x";

test("pilot-ride-day", async ({ record }) => {
  const page = await record({
    slug: "pilot-ride-day",
    account: "pilot",
    warm: ["/pilot", ride, "/pilot/chat", chat],
  });
  await blockExternalLinks(page);
  await page.goto("/pilot");
  await expect(page.getByRole("heading", { name: "Hi Piet" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await tap(page, page.locator(`main a[href="${ride}"]`).first(), 1000);
  await expect(
    page.getByRole("heading", { name: "Picking up the trishaw" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
  await scrollBy(page, 330, 1400);
  await tap(
    page,
    page.getByRole("link", { name: "Open in Maps" }).first(),
    1000,
  );
  await scrollBy(page, 330, 2600);
  await scrollBy(page, 330, 1400);
  await tap(
    page,
    page.getByRole("link", { name: "Call Inge Caretaker" }),
    1500,
  );
  await scrollBy(page, -2000, 1200);
  await tap(page, page.getByRole("link", { name: /Ride chat/ }), 1200);
  await page.waitForURL(/\/pilot\/chat\//);
  await page.waitForLoadState("networkidle");
  await pause(page, 2200);
});
