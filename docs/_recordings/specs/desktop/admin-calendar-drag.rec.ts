import { test } from "../../lib/rec";
import { click, drag, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

test("admin-calendar-drag", async ({ record }) => {
  const page = await record({
    slug: "admin-calendar-drag",
    account: "chapterAdmin",
    warm: [
      "/admin/rides",
      "/admin/rides?new=1&date=2026-10-16&start=15:00&end=16:30",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-calendar-drag", t0);
  await pause(page, 1000);
  const main = page.getByRole("main");
  const fri = await main.getByText("Fri 16/10").first().boundingBox();
  const sat = await main.getByText("Sat 17/10").first().boundingBox();
  const h15 = await main
    .getByText("15:00", { exact: true })
    .first()
    .boundingBox();
  const h16 = await main
    .getByText("16:00", { exact: true })
    .first()
    .boundingBox();
  if (!fri || !sat || !h15 || !h16) throw new Error("grid not found");
  const hour = h16.y - h15.y;
  const fx = fri.x + fri.width / 2;
  const y15 = h15.y + h15.height / 2;
  await drag(page, { x: fx, y: y15 + 4 }, { x: fx, y: y15 + hour * 1.5 - 4 });
  const drawer = page.getByRole("dialog").first();
  await drawer.waitFor();
  await settle(page);
  await pause(page, 2200);
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
  await pause(page, 1200);
  const card = page
    .getByRole("link", { name: /14:30 München – Seniorenheim Sonnenhof/ })
    .first();
  const box = await card.boundingBox();
  if (!box) throw new Error("ride not found");
  await moveTo(page, card);
  await pause(page, 800);
  const start = { x: box.x + box.width / 2, y: box.y + 14 };
  await drag(page, start, { x: start.x, y: start.y + hour * 1.5 });
  const undo = page.getByRole("button", { name: "Undo" });
  await undo.waitFor();
  await pause(page, 1800);
  await click(page, undo, 300);
  await page.getByText("Ride moved back").waitFor();
  await settle(page);
  await pause(page, 2000);
});
