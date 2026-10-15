import { test } from "../../lib/rec";
import { click, humanType, moveTo, pause } from "../../lib/human";
import { drag } from "../../lib/drag";
import { exact } from "../../lib/text";

test("super-new-chapter", async ({ record }) => {
  const page = await record({
    slug: "super-new-chapter",
    account: "country",
    warm: [
      "/admin/chapters",
      "/admin/chapters?new=1",
      "/admin/chapters/cmux001jc00033hm0tgsb5gfe",
    ],
  });
  await page.goto("/admin/chapters");
  await page.getByRole("heading", { name: "Chapters", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1000);

  await click(page, page.getByRole("link", { name: "New chapter" }), 700);
  const drawer = page.getByRole("dialog", { name: "New chapter" });
  await drawer.waitFor();

  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Chapter name" }),
    "Augsburg – Haus am Park",
  );
  await pause(page, 400);
  await click(page, drawer.getByRole("button", { name: exact("Edit") }), 300);
  const slug = drawer.getByRole("textbox", { name: exact("Web address") });
  await slug.selectText();
  await slug.pressSequentially("augsburg", { delay: 70 });
  await pause(page, 600);
  await click(page, drawer.getByRole("button", { name: exact("Done") }), 400);

  await humanType(
    page,
    drawer.getByRole("combobox", { name: "Find the address" }),
    "Rathausplatz Augsburg",
  );
  const option = page.getByRole("option", { name: /^Rathausplatz/ }).first();
  await option.waitFor();
  await pause(page, 400);
  await click(page, option, 1500);

  await drag(page, drawer.locator(".mapboxgl-marker.cursor-grab"), 30, 18);
  await pause(page, 1000);
  await drag(page, drawer.getByRole("slider"), 40, 0);
  await pause(page, 900);

  await click(
    page,
    drawer.getByRole("button", { name: /Create chapter/ }),
    400,
  );
  const done = page.getByRole("dialog", { name: /is on the map/ });
  await done.waitFor();
  await pause(page, 1300);
  await moveTo(page, done.getByRole("link", { name: /Print the poster/ }));
  await pause(page, 1100);
  await click(page, done.getByRole("button", { name: "Open chapter" }), 400);
  await page.waitForURL(/\/admin\/chapters\/c/);
  await page.getByRole("link", { name: "Back to chapters" }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 3000);
});
