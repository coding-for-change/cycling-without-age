import { record } from "./browser.mjs";

await record(
  "01-trishaws-create",
  { role: "chapter-admin", start: "/admin/trishaws" },
  async (page, { click, type, pause }) => {
    await click(page.getByRole("link", { name: "New trishaw" }));
    const drawer = page.getByRole("dialog");
    await type(
      drawer.getByRole("textbox", { name: "Name" }),
      "Example trishaw",
    );
    await pause();
    await click(drawer.getByRole("button", { name: "Add trishaw" }));
    await page.getByRole("link", { name: "All trishaws" }).waitFor();
    await pause(1500);
  },
);
