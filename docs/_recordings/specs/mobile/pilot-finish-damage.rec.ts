import { test, expect } from "../../lib/rec";
import { tap, humanType, pause } from "../../lib/human";
import { blockExternalLinks, scrollBy, scrollToBottom } from "../../lib/mobile";

const finish = "/pilot/rides/docs-finish-ride-1/finish";

test("pilot-finish-damage", async ({ record }) => {
  const page = await record({
    slug: "pilot-finish-damage",
    account: "pilot",
    warm: ["/pilot", finish, `${finish}?report=cmux001sj001f3hm0t6zc1bj2`],
  });
  await blockExternalLinks(page);
  await page.goto("/pilot");
  await expect(page.getByRole("heading", { name: "Hi Piet" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1500);
  await tap(
    page,
    page.getByRole("link", { name: /Finish your last ride/ }),
    1000,
  );
  await expect(
    page.getByRole("heading", { name: "Finish your ride" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
  await scrollBy(page, 300, 2200);
  await tap(page, page.getByRole("link", { name: "Report damage" }), 1000);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox").first()).toBeVisible();
  await pause(page, 800);
  await humanType(
    page,
    dialog.getByRole("textbox").first(),
    "Flat rear tyre, the left brake squeaks.",
  );
  await pause(page, 900);
  await tap(page, dialog.getByRole("button", { name: /^Send report/ }), 300);
  await expect(page.getByText(/the chapter admins have been told/)).toBeVisible(
    { timeout: 15_000 },
  );
  await pause(page, 2000);
  await scrollToBottom(page, 1200);
  await tap(page, page.getByRole("button", { name: /^Done/ }), 300);
  await expect(page.getByText("Thanks for riding!").last()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForURL((url) => url.pathname === "/pilot");
  await pause(page, 2200);
});
