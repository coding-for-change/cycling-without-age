import { test } from "../../lib/rec";
import { click, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

test("admin-schedule-ride", async ({ record }) => {
  const page = await record({
    slug: "admin-schedule-ride",
    account: "chapterAdmin",
    warm: [
      "/admin/rides",
      "/admin/rides?new=1",
      "/admin/rides/demo-ride-muenchen-400",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-schedule-ride", t0);
  await pause(page, 800);
  await click(
    page,
    page.getByRole("main").getByRole("link", { name: "Schedule a ride" }),
    900,
  );
  const drawer = page.getByRole("dialog").first();
  await drawer.getByRole("radio", { name: "Pleasure ride" }).waitFor();
  await settle(page);
  await click(page, drawer.getByRole("radio", { name: "Pleasure ride" }), 700);
  await click(
    page,
    drawer.locator("button").filter({ hasText: "Europe/Berlin" }),
    500,
  );
  await click(page, drawer.getByRole("button", { name: /Date/ }), 500);
  await click(
    page,
    page.getByRole("button", { name: "Saturday, 17 October 2026" }),
    500,
  );
  await click(page, drawer.getByRole("button", { name: /Starts/ }), 400);
  await page.keyboard.type("10:00", { delay: 120 });
  await page.keyboard.press("Enter");
  await pause(page, 600);
  await click(
    page,
    drawer.getByRole("combobox", { name: "Where it starts" }),
    500,
  );
  await click(
    page,
    page.getByRole("option", { name: /Chapter location/ }),
    900,
  );
  await click(page, drawer.getByRole("button", { name: /Add trishaws/ }), 600);
  await click(page, page.getByRole("radio", { name: /Zugspitze/ }), 700);
  if (await page.getByRole("dialog", { name: "Trishaws" }).isVisible()) {
    await page.keyboard.press("Escape");
    await pause(page, 400);
  }
  await click(
    page,
    drawer.getByRole("button", { name: /Add passengers/ }),
    500,
  );
  await page.keyboard.type("Erna", { delay: 120 });
  await pause(page, 500);
  await click(page, page.getByRole("option", { name: "Erna Huber" }), 500);
  await page.keyboard.press("Escape");
  await pause(page, 500);
  await click(page, drawer.getByRole("button", { name: /Add pilots/ }), 500);
  await page.keyboard.type("Pernille", { delay: 120 });
  await pause(page, 500);
  await click(
    page,
    page.getByRole("option", { name: "Pernille Pending" }),
    500,
  );
  await page.keyboard.press("Escape");
  await pause(page, 1200);
  if (process.env.DRY) {
    await page.screenshot({
      path: "/private/tmp/claude-501/frames/sched-dry.png",
    });
    return;
  }
  await moveTo(page, drawer.getByRole("button", { name: /Schedule ride/ }));
  await pause(page, 600);
  await page.keyboard.press("Meta+Enter");
  await drawer.waitFor({ state: "hidden" });
  await settle(page);
  await page
    .locator("h1")
    .filter({ hasText: "Pleasure ride" })
    .waitFor({ timeout: 30_000 });
  await settle(page);
  await pause(page, 1800);
  await click(page, page.getByRole("link", { name: "All rides" }), 600);
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  const card = page
    .getByRole("link", { name: /10:00 München – Seniorenheim Sonnenhof/ })
    .first();
  await card.waitFor();
  await pause(page, 600);
  await moveTo(page, card);
  await pause(page, 2200);
});
