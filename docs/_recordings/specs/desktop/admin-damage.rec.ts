import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const TRISHAW = "/admin/trishaws/cmv8qmxq4002y3hjkta8d07kx";

test("admin-damage", async ({ record }) => {
  const page = await record({
    slug: "admin-damage",
    account: "chapterAdmin",
    warm: ["/admin/trishaws", `${TRISHAW}?report=1`],
  });
  const t0 = Date.now();
  await page.goto("/admin/trishaws");
  await page.getByRole("heading", { name: "Trishaws", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-damage", t0);
  await pause(page, 800);
  await click(page, page.getByRole("link", { name: "Föhn" }), 300);
  const report = page.getByRole("link", { name: "Report damage" });
  await report.waitFor({ timeout: 30_000 });
  await pause(page, 1200);
  await click(page, report, 700);
  const drawer = page.getByRole("dialog", { name: "Report damage" });
  await drawer.waitFor();
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "What is wrong?" }),
    "Front brake cable frayed, brakes feel soft.",
  );
  await click(
    page,
    drawer.getByRole("switch", { name: "Ground this trishaw" }),
    900,
  );
  await click(page, drawer.getByRole("button", { name: "Send report" }), 300);
  await drawer.waitFor({ state: "hidden" });
  await pause(page, 1500);
  await moveTo(page, page.getByRole("combobox", { name: "Status" }));
  await pause(page, 1500);
  const clear = page
    .getByRole("button", { name: "Clear", exact: false })
    .filter({ hasNotText: "damage" })
    .first();
  await moveTo(page, clear);
  await pause(page, 600);
  await click(page, clear, 700);
  const dialog = page.getByRole("dialog", { name: "Clear this damage" });
  await dialog.waitFor();
  await humanType(
    page,
    dialog.getByRole("textbox", { name: "What happened?" }),
    "New brake cable fitted at the bike shop.",
  );
  await click(page, dialog.getByRole("button", { name: "Clear damage" }), 300);
  await dialog.waitFor({ state: "hidden" });
  await pause(page, 1500);
  const status = page.getByRole("combobox", { name: "Status" });
  await moveTo(page, status);
  await pause(page, 500);
  await status.click();
  await pause(page, 300);
  await status.selectOption({ index: 0 });
  await pause(page, 2500);
});
