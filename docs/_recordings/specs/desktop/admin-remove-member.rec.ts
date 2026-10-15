import { test } from "../../lib/rec";
import { click, pause, moveTo } from "../../lib/human";
import { markCut, markStart, settle } from "../../lib/wait";

const NAME = "Tobias Brandl";

test("admin-remove-member", async ({ record }) => {
  const page = await record({
    slug: "admin-remove-member",
    account: "chapterAdmin",
    warm: ["/admin/members", "/admin/members/demo-user-muenchen-p1"],
  });
  const t0 = Date.now();
  await page.goto("/admin/members");
  await page.getByRole("heading", { name: "Members", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-remove-member", t0);
  await pause(page, 900);
  const link = page.getByRole("link", { name: NAME });
  await moveTo(page, link);
  await pause(page, 700);
  await click(page, link, 300);
  const remove = page.getByRole("button", { name: "Remove from chapter" });
  await remove.waitFor({ timeout: 30_000 });
  await settle(page, 4000);
  await pause(page, 1500);
  await click(page, remove, 800);
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await pause(page, 1800);
  await click(
    page,
    dialog.getByRole("button", { name: "Remove from chapter" }),
    0,
  );
  await page.getByText(`${NAME} has left the chapter.`).waitFor();
  markCut("admin-remove-member", t0);
  await page.goto("/admin/members");
  await page
    .getByRole("heading", { name: "Everyone in the chapter" })
    .waitFor();
  await settle(page);
  markCut("admin-remove-member", t0);
  await pause(page, 800);
  await moveTo(page, page.getByRole("link", { name: "Pernille Pending" }));
  await pause(page, 2500);
});
