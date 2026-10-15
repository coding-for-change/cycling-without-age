import type { Page } from "@playwright/test";
import { latestCode } from "./mailpit";

export async function signIn(
  page: Page,
  email: string,
  opts: { slow?: boolean } = {},
) {
  const delay = opts.slow ? 70 : 0;
  await page.goto("/sign-in");
  const field = page.locator("input[type=text]").first();
  await field.click();
  await field.pressSequentially(email, { delay });
  let since = Date.now();
  await field.press("Enter");
  for (let attempt = 0; attempt < 4; attempt++) {
    const outcome = await Promise.race([
      page
        .waitForURL(/\/sign-in\/code/, { timeout: 20_000 })
        .then(() => "code" as const),
      page
        .getByRole("alert")
        .filter({ hasText: /too many/i })
        .waitFor({ timeout: 20_000 })
        .then(() => "limited" as const),
    ]);
    if (outcome === "code") break;
    await page.waitForTimeout(61_000);
    since = Date.now();
    await page
      .getByRole("button", { name: /continue/i })
      .first()
      .click();
  }
  const code = await latestCode(email, since);
  await page.waitForTimeout(opts.slow ? 600 : 100);
  await page.keyboard.type(code, { delay: opts.slow ? 120 : 0 });
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 30_000,
  });
}
