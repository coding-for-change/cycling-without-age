import { test } from "../../lib/rec";
import { click, humanType, pause, moveTo } from "../../lib/human";
import { markStart, settle } from "../../lib/wait";

const TITLE = "Herbstfahrt crew";

test("admin-chat-group", async ({ record }) => {
  const page = await record({
    slug: "admin-chat-group",
    account: "chapterAdmin",
    warm: [
      "/admin/chat",
      "/admin/chat?new=1",
      "/admin/chat/cmv8pk7la00193hjhng5urd67",
    ],
  });
  const t0 = Date.now();
  await page.goto("/admin/chat");
  await page.getByRole("heading", { name: "Chat", level: 1 }).waitFor();
  await settle(page, 3000);
  markStart("admin-chat-group", t0);
  await pause(page, 900);
  await click(page, page.getByRole("link", { name: /^New/ }), 800);
  const drawer = page.getByRole("dialog", { name: "New chat" });
  await drawer.getByRole("tab", { name: "Group" }).waitFor();
  await settle(page, 3000);
  await click(page, drawer.getByRole("tab", { name: "Group" }), 600);
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Group name" }),
    TITLE,
  );
  const people = drawer.getByRole("combobox");
  for (const [query, name] of [
    ["Ingr", "Ingrid Koch"],
    ["Karl W", "Karl Weber"],
    ["Pern", "Pernille Pending"],
  ]) {
    await humanType(page, people, query);
    const option = page.getByRole("option", { name: new RegExp(name) }).first();
    await option.waitFor();
    await pause(page, 400);
    await click(page, option, 600);
  }
  await pause(page, 800);
  await click(page, drawer.getByRole("button", { name: "Create group" }), 300);
  await drawer.waitFor({ state: "hidden", timeout: 30_000 });
  const composer = page.getByRole("textbox").last();
  await composer.waitFor();
  await settle(page, 3000);
  await pause(page, 1200);
  await humanType(
    page,
    composer,
    "Hi all! Meeting point for Monday's Herbstfahrt is the Sonnenhof garage at 13:30.",
  );
  await pause(page, 500);
  await page.keyboard.press("Enter");
  await pause(page, 2500);
});
