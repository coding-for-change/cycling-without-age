import { test } from "../../lib/rec";
import { click, humanType, moveTo, pause } from "../../lib/human";

test("super-model-catalogue", async ({ record }) => {
  const page = await record({
    slug: "super-model-catalogue",
    account: "country",
    warm: [
      "/admin/trishaws/types",
      "/admin/trishaws/types?new=1",
      "/admin/trishaws/types/cmux001rn00143hm06u1bfg8u",
    ],
  });
  await page.goto("/admin/trishaws/types");
  await page.getByRole("heading", { name: "Models", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  await click(page, page.getByRole("link", { name: "New model" }), 800);
  const drawer = page.getByRole("dialog", { name: "New model" });
  await drawer.waitFor();
  const catalogue = drawer.getByRole("combobox", { name: "Catalogue" });
  await moveTo(page, catalogue);
  await pause(page, 400);
  await catalogue.selectOption(
    (await catalogue
      .locator("option", { hasText: "Augsburg" })
      .getAttribute("value"))!,
  );
  await pause(page, 700);
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Name" }),
    "Haus am Park Rikscha",
  );
  const seats = drawer.getByRole("combobox", { name: "Passenger seats" });
  await moveTo(page, seats);
  await pause(page, 300);
  await seats.selectOption(
    (await seats
      .locator("option", { hasText: "2 seats" })
      .getAttribute("value"))!,
  );
  await pause(page, 500);
  await click(page, drawer.getByRole("switch"), 700);
  await click(page, drawer.getByRole("button", { name: "Add model" }), 400);
  await page.getByText("Haus am Park Rikscha is in the catalogue.").waitFor();
  await pause(page, 1200);

  await page.waitForURL(/\/admin\/trishaws\/types\/c/);
  await page
    .getByRole("heading", { level: 1 })
    .filter({ hasText: "Haus am Park Rikscha" })
    .waitFor();
  await pause(page, 1500);

  const promote = page.getByRole("button", { name: /Promote to/ });
  await click(page, promote, 900);
  const confirm = page.getByRole("alertdialog");
  await confirm.waitFor();
  await pause(page, 2000);
  await click(page, confirm.getByRole("button", { name: "Cancel" }), 400);
  await pause(page, 1500);
});
