import { test } from "../../lib/rec";
import { click, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const RIDE = "/admin/rides/cmv8reozu007u3hjkymsf5yjc";

test("admin-staff-ride", async ({ record }) => {
  const page = await record({
    slug: "admin-staff-ride",
    account: "chapterAdmin",
    warm: ["/admin/rides", RIDE],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-staff-ride", t0);
  await pause(page, 900);
  await click(page, page.locator(`main a[href="${RIDE}"]`).first(), 300);
  await page
    .locator("h1")
    .filter({ hasText: "Pleasure ride" })
    .waitFor({ timeout: 30_000 });
  await settle(page);
  await pause(page, 1000);
  await click(
    page,
    page.getByRole("heading", { name: "Where", level: 2 }),
    700,
  );
  const pilots = page
    .getByRole("group")
    .filter({ has: page.getByRole("heading", { name: "Pilots" }) });
  await moveTo(page, pilots.getByText("No pilot on this ride yet."));
  await pause(page, 1200);
  await click(
    page,
    pilots.getByRole("button", { name: "Put a pilot on" }),
    700,
  );
  await page.keyboard.type("Piet", { delay: 130 });
  await pause(page, 600);
  await click(
    page,
    page.getByRole("option", { name: /Piet Pilot/ }).first(),
    300,
  );
  await pilots
    .getByRole("link", { name: /Piet Pilot/ })
    .or(pilots.getByText("Piet Pilot"))
    .first()
    .waitFor();
  await settle(page);
  await pause(page, 1200);
  await moveTo(page, pilots.getByText("Piet Pilot").first());
  await pause(page, 2000);
});
