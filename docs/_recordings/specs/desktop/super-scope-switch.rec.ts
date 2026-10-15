import { test } from "../../lib/rec";
import { click, humanType, moveTo, pause } from "../../lib/human";
import { exact } from "../../lib/text";

const GERMANY = "DE";
const MUNICH = "muenchen";

test("super-scope-switch", async ({ record }) => {
  const page = await record({
    slug: "super-scope-switch",
    account: "superadmin",
    warm: [
      "/admin/members",
      `/admin/members?country=${GERMANY}`,
      `/admin/members?chapter=${MUNICH}`,
    ],
  });
  await page.goto("/admin/members");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1500);

  const switcher = page.getByRole("button", {
    name: /Switch perspective or chapter/,
  });
  await click(page, switcher, 700);
  await click(
    page,
    page.getByRole("menuitem", { name: "All chapters in Deutschland" }),
    400,
  );
  await page.waitForLoadState("networkidle");
  await pause(page, 2000);

  await click(page, switcher, 700);
  await click(page, page.getByRole("menuitem", { name: /München/ }), 400);
  await page.waitForLoadState("networkidle");
  await pause(page, 2200);

  await moveTo(page, page.getByRole("main").getByRole("heading", { level: 1 }));
  await page.keyboard.press("Meta+k");
  const bar = page.getByRole("dialog", { name: "Command bar" });
  await bar.waitFor();
  await pause(page, 900);
  await humanType(page, bar.getByRole("combobox"), "All chapters");
  await pause(page, 900);
  await click(
    page,
    bar
      .getByRole("group", { name: "Scope" })
      .getByRole("option", { name: exact("All chapters") }),
    400,
  );
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
});
