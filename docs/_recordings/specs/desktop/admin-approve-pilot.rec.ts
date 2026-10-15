import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

test("admin-approve-pilot", async ({ record }) => {
  const page = await record({
    slug: "admin-approve-pilot",
    account: "chapterAdmin",
    warm: ["/admin/rides", "/admin/members"],
  });
  const t0 = Date.now();
  await page.goto("/admin/rides");
  await page.getByRole("heading", { name: "Rides", level: 1 }).waitFor();
  await settle(page);
  markStart("admin-approve-pilot", t0);
  await pause(page, 800);
  await click(page, page.getByRole("link", { name: "Members" }).first(), 900);
  await page.getByRole("heading", { name: "Waiting for approval" }).waitFor();
  await settle(page);
  const row = page.getByRole("row").filter({ hasText: "Pernille Pending" });
  await moveTo(page, row.getByRole("link", { name: "Pernille Pending" }));
  await pause(page, 1200);
  await click(page, row.getByRole("button", { name: "Approve" }), 900);
  const drawer = page.getByRole("dialog");
  await drawer.waitFor();
  await pause(page, 800);
  await humanType(
    page,
    drawer.getByRole("textbox"),
    "Welcome! Training ride is Saturday at 10:00 at the Sonnenhof garage.",
  );
  await pause(page, 700);
  if (process.env.DRY) return;
  await click(page, drawer.getByRole("button", { name: "Approve" }), 300);
  await page.getByText("Pernille Pending is aboard.").waitFor();
  await pause(page, 1500);
  await moveTo(
    page,
    page.getByRole("heading", { name: "Everyone in the chapter" }),
  );
  await pause(page, 1800);
});
