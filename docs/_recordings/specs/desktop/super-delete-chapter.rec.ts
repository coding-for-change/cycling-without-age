import { test } from "../../lib/rec";
import { click, humanType, pause } from "../../lib/human";

test("super-delete-chapter", async ({ record }) => {
  const page = await record({
    slug: "super-delete-chapter",
    account: "country",
    warm: ["/admin/chapters", "/admin/chapters/cmv8qo1a600323hjkoea6zyfd"],
  });
  await page.goto("/admin/chapters");
  await page.getByRole("heading", { name: "Chapters", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  await click(
    page,
    page
      .getByRole("row")
      .filter({ hasText: "Augsburg – Haus am Park" })
      .getByText("Augsburg – Haus am Park"),
    400,
  );
  await page.waitForURL(/\/admin\/chapters\/c/);
  const trash = page.getByRole("button", { name: "Delete chapter" });
  await trash.waitFor();
  await pause(page, 2000);

  await click(page, trash, 800);
  const dialog = page.getByRole("dialog", {
    name: /Delete Augsburg – Haus am Park for good/,
  });
  await dialog.waitFor();
  await pause(page, 2200);
  await humanType(
    page,
    dialog.getByRole("textbox"),
    "DELETE-AUGSBURG-HAUS-AM-PARK",
  );
  await pause(page, 700);
  await click(
    page,
    dialog.getByRole("button", { name: "Delete chapter" }),
    400,
  );
  await page.getByText("Augsburg – Haus am Park is gone.").waitFor();
  await pause(page, 2200);
});
