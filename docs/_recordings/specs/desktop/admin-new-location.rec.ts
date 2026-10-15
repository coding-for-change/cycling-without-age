import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const NAME = process.env.L_NAME ?? "Garage Lindwurmstraße";

test("admin-new-location", async ({ record }) => {
  const page = await record({
    slug: "admin-new-location",
    account: "chapterAdmin",
    warm: ["/admin/locations", "/admin/locations?new=location"],
  });
  const t0 = Date.now();
  await page.goto("/admin/locations");
  await page.getByRole("heading", { name: "Locations", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-new-location", t0);
  await pause(page, 900);
  await click(page, page.getByRole("link", { name: "New location" }), 900);
  const drawer = page.getByRole("dialog");
  await drawer.waitFor();
  await settle(page);
  await humanType(page, drawer.getByRole("textbox", { name: "Name" }), NAME);
  await humanType(
    page,
    drawer.getByRole("combobox", { name: "Address" }),
    "Lindwurmstraße 88, 80337 München",
  );
  const option = drawer.getByRole("option", { name: /80337 Munich/ }).first();
  await option.waitFor();
  await pause(page, 700);
  await click(page, option, 1800);
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "How to find the entrance" }),
    "Blue gate in the courtyard, second door on the right",
  );
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Access code" }),
    "4711",
  );
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "When bringing it back" }),
    "Plug in the charger, lock the back wheel and close the gate.",
  );
  await pause(page, 900);
  if (process.env.DRY) return;
  await click(page, drawer.getByRole("button", { name: "Add location" }), 300);
  await drawer.waitFor({ state: "hidden" });
  await settle(page);
  await pause(page, 2500);
});
