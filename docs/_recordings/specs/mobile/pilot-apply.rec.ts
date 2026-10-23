import { test, expect } from "../../lib/rec";
import { tap, humanType, pause } from "../../lib/human";
import { placeInMunich, tickAll, waitForSendSlot } from "../../lib/mobile";
import { enterEmailAndCode } from "../../lib/visible-sign-in";

const email = process.env.DOCS_PILOT_EMAIL ?? "new.pilot.docs@cwa.local";

test("pilot-apply", async ({ record }) => {
  await waitForSendSlot();
  const page = await record({
    slug: "pilot-apply",
    account: null,
    warm: [
      "/welcome",
      "/sign-in",
      "/sign-in/code",
      "/sign-in/role",
      "/location?as=pilot",
    ],
  });
  await placeInMunich(page);
  await page.goto("/sign-in");
  await enterEmailAndCode(page, email);
  await page.waitForURL(/\/sign-in\/role/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /How would you like to take part/ }),
  ).toBeVisible();
  await pause(page, 1500);
  await tap(
    page,
    page.getByRole("button", { name: /I want to be a Pilot/ }),
    800,
  );
  await page.waitForURL(/\/location/);
  await expect(page.getByRole("button", { name: /^München/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 1800);
  await tap(page, page.getByRole("button", { name: /^München/ }), 900);
  await tap(page, page.getByRole("button", { name: /^Request to join/ }), 800);
  await page.waitForURL(/\/onboarding\/consent/);
  await expect(
    page.getByRole("heading", { name: /Before you start/ }),
  ).toBeVisible();
  await pause(page, 1500);
  await tickAll(page, page.getByRole("main"));
  await tap(page, page.getByRole("button", { name: /^Continue/ }), 800);
  await page.waitForURL(/\/onboarding\/profile/);
  await expect(page.getByRole("textbox", { name: "First name" })).toBeVisible();
  await pause(page, 1000);
  await humanType(
    page,
    page.getByRole("textbox", { name: "First name" }),
    "Paula",
  );
  await humanType(
    page,
    page.getByRole("textbox", { name: "Last name" }),
    "Pedal",
  );
  await tap(page, page.getByRole("textbox", { name: "Birthday" }), 300);
  await page.keyboard.type("05101975", { delay: 120 });
  await pause(page, 500);
  await tap(page, page.getByRole("button", { name: /^Female/ }), 700);
  await tap(page, page.getByRole("button", { name: /^Continue/ }), 800);
  await page.waitForURL(/\/onboarding\/passkey/);
  await expect(
    page.getByRole("heading", { name: /Create your passkey/ }),
  ).toBeVisible();
  await pause(page, 1800);
  await tap(page, page.getByRole("button", { name: /^Not now/ }), 800);
  await page.waitForURL(/\/onboarding\/pilot/);
  await expect(
    page.getByRole("heading", { name: /How you become a pilot/ }),
  ).toBeVisible();
  await pause(page, 3000);
  await tap(page, page.getByRole("button", { name: /^Next/ }), 800);
  await page.waitForURL((url) => url.pathname === "/pilot", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: /Your request is with/ }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 3000);
});
