import { test } from "../../lib/rec";
import { click, humanType, pause } from "../../lib/human";

test("super-chapter-invite-admin", async ({ record }) => {
  const page = await record({
    slug: "super-chapter-invite-admin",
    account: "country",
    warm: ["/admin/members", "/admin/members?chapter=augsburg"],
  });
  await page.goto("/admin/members");
  await page.getByRole("heading", { name: "Members", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  await click(
    page,
    page.getByRole("button", { name: /Switch perspective or chapter/ }),
    700,
  );
  await click(
    page,
    page.getByRole("menuitem", { name: /Augsburg – Haus am Park/ }),
    400,
  );
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  const invite = page.getByRole("button", { name: /Invite someone/ });
  await invite.waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  await click(page, invite, 800);
  const drawer = page.getByRole("dialog", { name: "Invite someone" });
  await drawer.waitFor();
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Their name" }),
    "Anna Augsburg",
  );
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Email address" }),
    "anna.augsburg@example.org",
  );
  await pause(page, 400);
  await click(page, drawer.getByRole("checkbox").nth(0), 500);
  await click(page, drawer.getByRole("checkbox").nth(1), 700);
  await click(
    page,
    drawer.getByRole("button", { name: "Send the invitation" }),
    400,
  );
  await page.getByText("Invitation sent to Anna Augsburg.").waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 2200);
});
