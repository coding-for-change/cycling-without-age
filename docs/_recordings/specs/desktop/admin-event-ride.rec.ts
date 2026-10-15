import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const TITLE = "Herbstfahrt an die Isar";

test("admin-event-ride", async ({ record }) => {
  const page = await record({
    slug: "admin-event-ride",
    account: "chapterAdmin",
    warm: [
      "/admin/rides",
      "/admin/rides?new=1",
      "/admin/rides/cmv8pjynr000h3hfnpa4lqdyw",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-event-ride", t0);
  await pause(page, 800);
  await click(
    page,
    page.getByRole("main").getByRole("link", { name: "Schedule a ride" }),
    900,
  );
  const drawer = page.getByRole("dialog").first();
  await drawer.getByRole("radio", { name: "Event ride" }).waitFor();
  await settle(page);
  await moveTo(page, drawer.getByRole("radio", { name: "Event ride" }));
  await pause(page, 700);
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Event title" }),
    TITLE,
  );
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Description" }),
    "Along the river to the Flaucher, hot chocolate at the kiosk.",
  );
  await click(
    page,
    drawer.locator("button").filter({ hasText: "Europe/Berlin" }),
    500,
  );
  await click(page, drawer.getByRole("button", { name: /Date/ }), 500);
  await click(
    page,
    page.getByRole("button", { name: "Monday, 19 October 2026" }),
    500,
  );
  await click(page, drawer.getByRole("button", { name: /Starts/ }), 400);
  await page.keyboard.type("14:00", { delay: 120 });
  await page.keyboard.press("Enter");
  await pause(page, 400);
  await click(page, drawer.getByRole("button", { name: /Ends/ }), 400);
  await page.keyboard.type("16:30", { delay: 120 });
  await page.keyboard.press("Enter");
  await pause(page, 500);
  await click(
    page,
    drawer.getByRole("combobox", { name: "Where it starts" }),
    500,
  );
  await click(
    page,
    page.getByRole("option", { name: /Chapter location/ }),
    800,
  );
  await click(page, drawer.getByRole("button", { name: /Add trishaws/ }), 600);
  await click(
    page,
    page
      .getByRole("checkbox", { name: /Zugspitze/ })
      .or(page.getByRole("radio", { name: /Zugspitze/ }))
      .first(),
    400,
  );
  await click(
    page,
    page
      .getByRole("checkbox", { name: /Föhn/ })
      .or(page.getByRole("radio", { name: /Föhn/ }))
      .first(),
    400,
  );
  await page.keyboard.press("Escape");
  await pause(page, 400);
  await click(
    page,
    drawer.getByRole("button", { name: "One pilot more" }),
    500,
  );
  await humanType(
    page,
    drawer.getByRole("spinbutton", { name: "Capacity" }),
    "4",
  );
  await pause(page, 1000);
  if (process.env.DRY) {
    await page.screenshot({
      path: "/private/tmp/claude-501/frames/event-dry.png",
    });
    return;
  }
  await page.keyboard.press("Meta+Enter");
  await page
    .locator("h1")
    .filter({ hasText: TITLE })
    .waitFor({ timeout: 30_000 });
  await settle(page);
  await pause(page, 1500);
  const book = page
    .getByRole("group")
    .filter({ has: page.getByRole("heading", { name: "Riders can book" }) });
  const toggle = book.getByRole("switch");
  await moveTo(page, toggle);
  await pause(page, 900);
  await click(page, toggle, 300);
  await page
    .getByText(/Saved|announced/i)
    .first()
    .waitFor()
    .catch(() => {});
  await pause(page, 2200);
});
