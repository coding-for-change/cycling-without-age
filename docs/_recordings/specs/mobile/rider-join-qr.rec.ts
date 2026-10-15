import { test, expect } from "../../lib/rec";
import { tap, humanType, pause } from "../../lib/human";
import { scrollBy, tickAll, waitForSendSlot } from "../../lib/mobile";
import { enterEmailAndCode } from "../../lib/visible-sign-in";

const email = process.env.DOCS_RIDER_EMAIL ?? "new.rider.docs@cwa.local";

test("rider-join-qr", async ({ record }) => {
  await waitForSendSlot();
  const page = await record({
    slug: "rider-join-qr",
    account: null,
    warm: ["/join/muenchen", "/sign-in", "/sign-in/code"],
  });
  await page.goto("/join/muenchen");
  await expect(
    page.getByRole("heading", { name: /München/, level: 1 }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 2000);
  await scrollBy(page, 200, 1200);
  await tap(
    page,
    page.getByRole("link", { name: /Come along for a ride/ }),
    800,
  );
  await page.waitForURL(/\/sign-in/);
  await enterEmailAndCode(page, email);
  await page.waitForURL(/\/onboarding\/consent/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /quick agreements/ }),
  ).toBeVisible();
  await pause(page, 1500);
  await tickAll(page, page.getByRole("main"));
  await tap(page, page.getByRole("button", { name: /^Continue/ }), 800);
  await page.waitForURL(/\/onboarding\/profile/);
  await expect(page.getByRole("textbox", { name: "First name" })).toBeVisible();
  await pause(page, 1200);
  await humanType(
    page,
    page.getByRole("textbox", { name: "First name" }),
    "Rosa",
  );
  await humanType(
    page,
    page.getByRole("textbox", { name: "Last name" }),
    "Rider",
  );
  await tap(page, page.getByRole("textbox", { name: "Birthday" }), 300);
  await page.keyboard.type("03141938", { delay: 120 });
  await pause(page, 500);
  await tap(page, page.getByRole("button", { name: /^Female/ }), 700);
  await tap(page, page.getByRole("button", { name: /^Continue/ }), 800);
  await page.waitForURL(/\/onboarding\/passkey/);
  await expect(
    page.getByRole("heading", { name: /Create your passkey/ }),
  ).toBeVisible();
  await pause(page, 1500);
  await tap(page, page.getByRole("button", { name: /^Not now/ }), 800);
  await page.waitForURL((url) => url.pathname === "/passenger", {
    timeout: 30_000,
  });
  await expect(page.getByRole("heading", { name: /Hi Rosa/ })).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 3000);
});
