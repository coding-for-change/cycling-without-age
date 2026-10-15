import { expect, type Page } from "@playwright/test";
import { tap, humanType, pause } from "./human";
import { latestCode } from "./mailpit";

export async function enterEmailAndCode(page: Page, email: string) {
  const field = page.getByRole("textbox", { name: /email or phone/ });
  await expect(field).toBeVisible();
  await pause(page, 700);
  await humanType(page, field, email);
  const since = Date.now();
  await tap(
    page,
    page.getByRole("button", { name: /^Continue\W*$/ }).first(),
    300,
  );
  await page.waitForURL(/\/sign-in\/code/, { timeout: 20_000 });
  const code = await latestCode(email, since);
  await pause(page, 1500);
  await page.keyboard.type(code, { delay: 160 });
}
