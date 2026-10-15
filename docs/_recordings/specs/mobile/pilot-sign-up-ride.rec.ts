import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { scrollToBottom } from "../../lib/mobile";

const ride = "/pilot/rides/cmv8pjyv4001m3hfn85zt9xrt";

test("pilot-sign-up-ride", async ({ record }) => {
  const page = await record({
    slug: "pilot-sign-up-ride",
    account: "pilot",
    warm: ["/pilot", "/pilot/rides", ride],
  });
  await page.goto("/pilot");
  await expect(page.getByRole("heading", { name: "Hi Piet" })).toBeVisible();
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
    page.getByRole("heading", { name: /Open rides in/ }),
  ).toBeVisible();
  await pause(page, 1200);
  await tap(page, page.locator(`a[href="${ride}"]`).first(), 1000);
  await expect(
    page.getByRole("button", { name: "Sign up for this ride" }),
  ).toBeVisible();
  await pause(page, 2200);
  await scrollToBottom(page);
  await tap(
    page,
    page.getByRole("button", { name: "Sign up for this ride" }),
    300,
  );
  await expect(page.getByText("You're on the ride. Thank you!")).toBeVisible({
    timeout: 15_000,
  });
  await pause(page, 1500);
  await page
    .getByRole("heading", { name: "Riders" })
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await pause(page, 2000);
});
