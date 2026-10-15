import { test } from "../../lib/rec";
import { click, humanType, moveTo, pause } from "../../lib/human";
import { statePath } from "../../lib/accounts";

const POOL_CODE = /DE-[A-Z0-9]{4}-[A-Z0-9]{2}/;

test("super-pool", async ({ record, browser, baseURL }) => {
  test.setTimeout(240_000);
  const page = await record({
    slug: "super-pool",
    account: "country",
    warm: [
      "/admin/locations/pools",
      "/admin/locations/pools?new=pool",
      "/admin/locations/cmux001ru00173hm03luck493",
      "/admin/locations?chapter=augsburg&join=1",
    ],
  });
  await page.goto("/admin/locations/pools");
  await page.getByRole("link", { name: "New pool" }).waitFor();
  await page.waitForLoadState("networkidle");
  await pause(page, 1200);

  await click(page, page.getByRole("link", { name: "New pool" }), 800);
  const drawer = page.getByRole("dialog", { name: "New pool" });
  await drawer.waitFor();
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "Name" }),
    "Depot Augsburg Mitte",
  );
  await humanType(
    page,
    drawer.getByRole("combobox", { name: "Address" }),
    "Bahnhofstraße Augsburg",
  );
  const option = page.getByRole("option").first();
  await option.waitFor();
  await pause(page, 400);
  await click(page, option, 1200);
  await humanType(
    page,
    drawer.getByRole("textbox", { name: "How to find the entrance" }),
    "Blue gate next to the bakery",
  );
  await pause(page, 500);
  await click(page, drawer.getByRole("button", { name: "Start pool" }), 400);

  await page.waitForURL(/\/admin\/locations\/c/);
  const code = page.getByText(POOL_CODE).first();
  await code.waitFor();
  await pause(page, 1500);
  await moveTo(page, code);
  await pause(page, 1600);

  const poolCode = (await code.innerText()).match(POOL_CODE)![0];
  const other = await browser.newContext({
    baseURL,
    storageState: statePath("country"),
  });
  const join = await other.newPage();
  await join.goto("/admin/locations?chapter=augsburg&join=1");
  await join.getByRole("textbox", { name: "Pool code" }).fill(poolCode);
  await join.getByRole("button", { name: "Send request" }).click();
  await join.getByText(/Request sent/).waitFor();
  await other.close();

  await page.reload();
  const waiting = page.getByRole("region", { name: /Waiting for you/ });
  await waiting.waitFor();
  await pause(page, 1500);
  await moveTo(page, waiting.getByText(/Augsburg – Haus am Park/));
  await pause(page, 900);
  await click(page, waiting.getByRole("button", { name: "Approve" }), 900);
  const confirm = page
    .getByRole("alertdialog")
    .or(page.getByRole("dialog", { name: /use this pool/ }));
  await confirm.waitFor();
  await pause(page, 900);
  await click(page, confirm.getByRole("button", { name: "Approve" }), 400);
  await page.getByText(/may now use the pool/).waitFor();
  await pause(page, 1300);

  await click(page, page.getByRole("switch"), 400);
  await pause(page, 2000);
});
