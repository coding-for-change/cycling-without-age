import { test } from "../../lib/rec";
import { click, humanType, pause } from "../../lib/human";

test("super-delete-user", async ({ record }) => {
  const page = await record({
    slug: "super-delete-user",
    account: "superadmin",
    warm: ["/admin/members", "/admin/members/IpMwxcKUp4Hgdg5t75uWeiTLBQ2Kqz9a"],
  });
  await page.goto("/admin/members");
  await page.getByRole("heading", { name: "Members", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  const table = page.getByRole("table").last();
  await click(page, table.getByRole("button", { name: /Search/ }), 500);
  await humanType(
    page,
    table.getByRole("textbox", { name: /Search/ }),
    "Anna Augsburg",
  );
  await pause(page, 900);
  await click(page, table.getByRole("link", { name: "Anna Augsburg" }), 400);
  await page
    .getByRole("heading", { name: "Anna Augsburg", level: 1 })
    .waitFor();
  await pause(page, 1600);

  await click(page, page.getByRole("button", { name: "Delete user" }), 800);
  const dialog = page.getByRole("dialog", {
    name: /Delete Anna Augsburg for good/,
  });
  await dialog.waitFor();
  await pause(page, 1200);
  await humanType(page, dialog.getByRole("textbox"), "DELETE-ANNA-AUGSBURG");
  await pause(page, 700);
  await click(page, dialog.getByRole("button", { name: "Delete user" }), 400);
  await page.getByText("Anna Augsburg is gone.").waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
});
