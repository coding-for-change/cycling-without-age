import { test } from "../../lib/rec";
import { click, humanType, moveTo, pause } from "../../lib/human";

test("super-new-country", async ({ record }) => {
  const page = await record({
    slug: "super-new-country",
    account: "superadmin",
    warm: ["/admin/countries", "/admin/countries?new=1"],
  });
  await page.goto("/admin/countries");
  await page.getByRole("heading", { name: "Countries", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1300);

  await click(page, page.getByRole("link", { name: "New country" }), 800);
  const drawer = page.getByRole("dialog", { name: "New country" });
  await drawer.waitFor();
  await humanType(
    page,
    drawer.getByRole("combobox", { name: "Country" }),
    "Austr",
  );
  await pause(page, 600);
  await click(page, page.getByRole("option", { name: /Austria/ }), 700);
  await moveTo(page, drawer.getByRole("textbox", { name: "Country name" }));
  await pause(page, 900);
  await click(page, drawer.getByRole("button", { name: "Save country" }), 400);
  await page.getByText("Austria joined the movement.").waitFor();
  await pause(page, 1600);

  const row = page.getByRole("row").filter({ hasText: "Austria" });
  await click(page, row.getByRole("button", { name: "Add admin" }), 800);
  const appoint = page.getByRole("dialog", { name: "Add a country admin" });
  await appoint.waitFor();
  await humanType(page, appoint.getByRole("textbox"), "multi@cwa.local");
  await pause(page, 500);
  await click(
    page,
    appoint.getByRole("button", { name: "Add a country admin" }),
    400,
  );
  await page.getByText("multi@cwa.local runs this country now.").waitFor();
  await pause(page, 1600);

  await click(
    page,
    row.getByRole("button", { name: /Remove Malou Multi/ }),
    800,
  );
  const confirm = page.getByRole("alertdialog");
  await confirm.waitFor();
  await pause(page, 900);
  await click(
    page,
    confirm.getByRole("button", { name: /Remove Malou Multi/ }),
    400,
  );
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
});
