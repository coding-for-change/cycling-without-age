import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const NAME = process.env.T_NAME ?? "Zugspitze";

test("admin-new-trishaw", async ({ record }) => {
  const page = await record({
    slug: "admin-new-trishaw",
    account: "chapterAdmin",
    warm: [
      "/admin/trishaws",
      "/admin/trishaws?new=1",
      "/admin/trishaws/cmux001sj001f3hm0t6zc1bj2",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/trishaws");
  await page.getByRole("heading", { name: "Trishaws", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-new-trishaw", t0);
  await pause(page, 900);
  await click(page, page.getByRole("link", { name: "New trishaw" }), 900);
  const drawer = page.getByRole("dialog");
  await drawer.waitFor();
  await settle(page);
  await humanType(page, drawer.getByRole("textbox", { name: "Name" }), NAME);
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Frame number" }),
    "TB-2025-00419",
  );
  await click(page, drawer.getByRole("combobox", { name: "Model" }), 500);
  await drawer
    .getByRole("combobox", { name: "Model" })
    .pressSequentially("Trio", { delay: 120 });
  await pause(page, 700);
  await click(
    page,
    page.getByRole("option", { name: /Triobike/ }).first(),
    600,
  );
  await click(page, drawer.getByRole("combobox", { name: "Location" }), 600);
  await click(
    page,
    page.getByRole("option", { name: /Garage Lindwurmstraße/ }).first(),
    600,
  );
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Description" }),
    "Blue frame, rain cover in the side bag",
  );
  await pause(page, 900);
  if (process.env.DRY) return;
  await click(page, drawer.getByRole("button", { name: "Add trishaw" }), 300);
  await page.waitForURL(/\/admin\/trishaws\/[^/?]+$/);
  await page
    .locator("h1")
    .filter({ hasText: NAME })
    .waitFor({ timeout: 30_000 });
  await settle(page);
  await pause(page, 1500);
  await moveTo(page, page.locator("h1").filter({ hasText: NAME }));
  await pause(page, 2000);
});
