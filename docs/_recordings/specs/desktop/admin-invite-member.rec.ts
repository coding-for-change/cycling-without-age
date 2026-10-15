import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const NAME = process.env.INVITE_NAME ?? "Lena Hofmann";
const EMAIL = process.env.INVITE_EMAIL ?? "lena.hofmann@example.org";

test("admin-invite-member", async ({ record }) => {
  const page = await record({
    slug: "admin-invite-member",
    account: "chapterAdmin",
    warm: ["/admin/members"],
  });
  const t0 = Date.now();
  await page.goto("/admin/members");
  await page.getByRole("heading", { name: "Members", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-invite-member", t0);
  await pause(page, 900);
  await click(page, page.getByRole("button", { name: "Invite someone" }), 900);
  const drawer = page.getByRole("dialog");
  await drawer.waitFor();
  await humanType(page, drawer.getByLabel("Their name"), NAME);
  await humanType(page, drawer.getByLabel("Email address"), EMAIL);
  await pause(page, 900);
  await moveTo(
    page,
    drawer.locator("label").filter({ hasText: "Does the pedalling" }),
  );
  await pause(page, 1000);
  await moveTo(
    page,
    drawer.locator("label").filter({ hasText: "Runs the chapter" }),
  );
  await pause(page, 700);
  await moveTo(
    page,
    drawer.locator("label").filter({ hasText: "Does the pedalling" }),
  );
  await pause(page, 600);
  if (process.env.DRY) return;
  await click(
    page,
    drawer.getByRole("button", { name: "Send the invitation" }),
    300,
  );
  await page.getByText(`Invitation sent to ${NAME}.`).waitFor();
  await settle(page);
  await pause(page, 1200);
  await moveTo(page, page.getByRole("row").filter({ hasText: NAME }).first());
  await pause(page, 1800);
});
