import { test, expect } from "../../lib/rec";
import { tap, pause } from "../../lib/human";

test("rider-book-event", async ({ record }) => {
  const page = await record({
    slug: "rider-book-event",
    account: "caretaker",
    warm: [
      "/passenger",
      "/passenger/rides",
      "/passenger/rides/cmv8pjyue00183hfns4rs71e3",
    ],
  });
  await page.goto("/passenger");
  await expect(
    page.getByRole("heading", { name: "Upcoming events" }),
  ).toBeVisible();
  await pause(page, 1200);
  await tap(
    page,
    page.getByRole("link", { name: /Ausfahrt in den Englischen Garten/ }),
    1200,
  );
  await expect(
    page.getByRole("heading", { name: "Book a seat" }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Book a seat" })
    .scrollIntoViewIfNeeded();
  await pause(page, 1200);
  await tap(page, page.getByText("Inge Caretaker", { exact: true }), 600);
  await tap(page, page.getByText("Walter Caretaker", { exact: true }), 500);
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
  );
  await pause(page, 900);
  await tap(page, page.getByRole("button", { name: "Book 2 seats" }), 300);
  await expect(page.getByText(/2 seats booked/)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByText(/2 seats booked/).scrollIntoViewIfNeeded();
  await pause(page, 2500);
});
