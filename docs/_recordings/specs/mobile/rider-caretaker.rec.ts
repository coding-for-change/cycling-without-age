import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";
import { placeInMunich, tickAll, waitForSendSlot } from "../../lib/mobile";
import { enterEmailAndCode } from "../../lib/visible-sign-in";

const email = process.env.DOCS_CARER_EMAIL ?? "new.carer.docs@cwa.local";

test("rider-caretaker", async ({ record }) => {
  await waitForSendSlot();
  const page = await record({
    slug: "rider-caretaker",
    account: null,
    warm: [
      "/sign-in",
      "/sign-in/code",
      "/sign-in/role",
      "/location?as=passenger",
    ],
  });
  await placeInMunich(page);
  await page.goto("/sign-in");
  await enterEmailAndCode(page, email);
  await page.waitForURL(/\/sign-in\/role/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /How would you like to take part/ }),
  ).toBeVisible();
  await pause(page, 1200);
  await tap(
    page,
    page.getByRole("button", { name: /I want to be a Passenger/ }),
    800,
  );
  await page.waitForURL(/\/location/);
  await expect(page.getByRole("button", { name: /^München/ })).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 1800);
  await tap(page, page.getByRole("button", { name: /^München/ }), 900);
  await tap(
    page,
    page
      .getByRole("button", { name: /^(Request to join|Next|Continue)/ })
      .last(),
    800,
  );
  await page.waitForURL(/\/onboarding\/consent/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /quick agreement/ }),
  ).toBeVisible();
  await pause(page, 1500);
  await tickAll(page, page.getByRole("main"));
  await tap(page, page.getByRole("button", { name: /^Continue/ }), 800);
  await page.waitForURL(/\/onboarding\/profile/);
  await expect(page.getByRole("textbox", { name: "First name" })).toBeVisible();
  await pause(page, 1500);
  await tap(
    page,
    page.getByRole("button", { name: /someone else to ride/ }),
    1000,
  );
  const relationship = page.getByRole("combobox", {
    name: /Your relationship to them/,
  });
  await relationship.scrollIntoViewIfNeeded();
  await tap(page, relationship, 400);
  await relationship.selectOption("child");
  await pause(page, 1000);
  await tap(page, page.getByRole("button", { name: /^Continue/ }).last(), 800);
  await page.waitForURL(/\/onboarding\/passkey/);
  await expect(
    page.getByRole("heading", { name: /Create your passkey/ }),
  ).toBeVisible();
  await pause(page, 1500);
  await tap(page, page.getByRole("button", { name: /^Not now/ }), 800);
  await page.waitForURL((url) => url.pathname === "/passenger", {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 3000);
});
