import fs from "node:fs";
import { test as setup } from "@playwright/test";
import {
  ACCOUNTS,
  ADMIN_ACCOUNTS,
  statePath,
  type Account,
} from "./lib/accounts";
import { signIn } from "./lib/sign-in";

for (const account of Object.keys(ACCOUNTS) as Account[]) {
  setup(`sign in ${account}`, async ({ page, context }) => {
    const file = statePath(account);
    const fresh =
      fs.existsSync(file) &&
      Date.now() - fs.statSync(file).mtimeMs < 12 * 3600_000;
    setup.skip(fresh && !process.env.DOCS_RESIGN, "session still fresh");
    await signIn(page, ACCOUNTS[account]);
    if (ADMIN_ACCOUNTS.includes(account)) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      await cdp.send("WebAuthn.addVirtualAuthenticator", {
        options: {
          protocol: "ctap2",
          transport: "internal",
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      });
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      if (page.url().includes("/onboarding/passkey")) {
        await page
          .getByRole("button", { name: /passkey/i })
          .first()
          .click();
        await page.waitForURL(
          (url) => !url.pathname.startsWith("/onboarding"),
          {
            timeout: 30_000,
          },
        );
      }
    }
    await page.screenshot({ path: `${__dirname}/.out/setup-${account}.png` });
    await context.storageState({ path: file });
  });
}
