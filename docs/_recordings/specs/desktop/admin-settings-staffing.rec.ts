import { test } from "../../lib/rec";
import { click, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

test("admin-settings-staffing", async ({ record }) => {
  const page = await record({
    slug: "admin-settings-staffing",
    account: "chapterAdmin",
    warm: ["/admin/settings"],
  });
  const t0 = Date.now();
  await page.goto("/admin/settings");
  await page.getByRole("heading", { name: "Settings", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-settings-staffing", t0);
  await pause(page, 900);
  await moveTo(
    page,
    page
      .getByText("http://localhost:3000/join/muenchen", { exact: false })
      .first(),
  );
  await pause(page, 1000);
  await moveTo(page, page.getByRole("button", { name: "Copy link" }));
  await pause(page, 600);
  await moveTo(page, page.getByRole("link", { name: "Print the poster" }));
  await pause(page, 600);
  await moveTo(page, page.getByRole("img", { name: /join\/muenchen/ }));
  await pause(page, 900);
  const staffing = page.getByRole("heading", { name: "Staffing" });
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 60);
    await pause(page, 40);
  }
  await staffing.scrollIntoViewIfNeeded();
  await pause(page, 800);
  const lead = page.getByRole("combobox", {
    name: "Warn about unstaffed rides",
  });
  await moveTo(page, lead);
  await pause(page, 500);
  await lead.click();
  await pause(page, 300);
  await lead.selectOption({ index: 3 });
  await pause(page, 2200);
  const toggle = page.getByRole("switch", {
    name: "Pilots sign up themselves",
  });
  await click(page, toggle, 2200);
  await click(page, toggle, 2400);
});
