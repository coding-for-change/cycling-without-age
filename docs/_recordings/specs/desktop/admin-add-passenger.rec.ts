import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const FIRST = process.env.P_FIRST ?? "Erna";
const LAST = process.env.P_LAST ?? "Huber";

test("admin-add-passenger", async ({ record }) => {
  const page = await record({
    slug: "admin-add-passenger",
    account: "chapterAdmin",
    warm: ["/admin/passengers", "/admin/passengers?new=1"],
  });
  const t0 = Date.now();
  await page.goto("/admin/passengers");
  await page.getByRole("heading", { name: "Passengers", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-add-passenger", t0);
  await pause(page, 900);
  await click(page, page.getByRole("link", { name: "Add a passenger" }), 900);
  const drawer = page.getByRole("dialog");
  await drawer.waitFor();
  await settle(page);
  await humanType(page, drawer.getByLabel("First name"), FIRST);
  await humanType(page, drawer.getByLabel("Last name"), LAST);
  const birthday = drawer.getByLabel("Birthday");
  await moveTo(page, birthday);
  await birthday.click({ position: { x: 12, y: 20 } });
  await birthday.pressSequentially("03121938", { delay: 90 });
  await pause(page, 400);
  await click(page, drawer.getByRole("combobox", { name: "Gender" }), 500);
  await moveTo(page, page.getByRole("option", { name: "Female" }));
  await pause(page, 300);
  await page.keyboard.press("Enter");
  await pause(page, 500);
  await humanType(
    page,
    drawer.getByLabel("Email or phone number"),
    `${FIRST.toLowerCase()}.${LAST.toLowerCase()}@example.org`,
  );
  await pause(page, 500);
  await click(
    page,
    drawer.getByRole("checkbox", { name: "Someone helps this person" }),
    700,
  );
  const helper = drawer.locator("div.rounded-2xl");
  await humanType(page, helper.getByLabel("Their name"), "Thomas Huber");
  await humanType(page, helper.getByLabel("Relationship"), "Son");
  await humanType(
    page,
    helper.getByLabel("Their email or phone number"),
    "thomas.huber@example.org",
  );
  await pause(page, 900);
  if (process.env.DRY) return;
  await click(page, drawer.getByRole("button", { name: "Add passenger" }), 300);
  await page.getByText(`${FIRST} ${LAST} is on the list.`).waitFor();
  await settle(page);
  await pause(page, 1000);
  const row = page
    .getByRole("row")
    .filter({ hasText: `${FIRST} ${LAST}` })
    .first();
  await moveTo(page, row);
  await pause(page, 1800);
});
