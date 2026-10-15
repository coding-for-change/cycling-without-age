import { test, expect } from "../../lib/rec";
import { tap, humanType, pause } from "../../lib/human";

const chat = "/pilot/chat/cmv8pk7ly001h3hjhd5tpqi0x";
const message =
  "Hi everyone! I'll be at the Chinese Tower at 14:45 with Isarwind.";

test("pilot-chat", async ({ record }) => {
  const page = await record({
    slug: "pilot-chat",
    account: "pilot",
    warm: ["/pilot", "/pilot/chat", chat],
  });
  await page.goto("/pilot");
  await expect(page.getByRole("heading", { name: "Hi Piet" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await tap(
    page,
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Chat" }),
    1000,
  );
  await expect(
    page.getByRole("heading", { name: "Chat", level: 1 }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1500);
  await tap(
    page,
    page.getByRole("link", { name: "Ausfahrt in den Englischen Garten" }),
    1000,
  );
  await expect(
    page.getByRole("textbox", { name: "Write a message" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);
  await humanType(
    page,
    page.getByRole("textbox", { name: "Write a message" }),
    message,
  );
  await pause(page, 500);
  await tap(page, page.getByRole("button", { name: "Send" }), 300);
  await expect(
    page.getByRole("region", { name: "Messages" }).getByText(message),
  ).toBeVisible({ timeout: 15_000 });
  await pause(page, 2500);
});
