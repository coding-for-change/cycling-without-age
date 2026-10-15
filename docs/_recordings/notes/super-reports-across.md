# super-reports-across

- Account: superadmin (Sanne Superadmin)
- Start URL: /admin/reports (scope: All chapters)
- Duration: ~37 s

## Steps
1. Reports page (heading **Reports**), breadcrumb "All chapters › Reports". The filter bar has the timeframe presets **7D / 30D / 90D / YTD / 12M / All**, a **Custom** range button, the period text ("15 Sept – 14 Oct 2026 · Compared with 16 Aug – 15 Sept 2026"), "Updated <time>" and a scope picker (**All chapters**).
2. The key figures row (Rides, Trips, Riders, Hours, Cancellations) shows the change against the previous period (for example "−27%") and a sparkline. Below it is the **Rides** chart ("Rides per day", stacked Event / Pleasure / Functional, dashed line = "Previous period").
3. Scroll down to **Where the rides happened** ("Bubble size shows rides. Zoom with Ctrl/⌘ + scroll or two fingers, pick a chapter to open it."): a globe with bubbles per region sized by rides.
4. Next to it is the **Leaderboard**, with metric toggles **Rides / Hours / Per pilot** and the tabs **Chapters** and **Countries**. On the Chapters tab each row shows rank, chapter, country, rides, a bar and a movement arrow (e.g. "↑ 4", "↓ 2", "–").
5. Click the **Countries** tab. It ranks Deutschland, Singapore, Danmark, United States, Nederland, with **See all** at the bottom. The metric toggle offers Rides / Hours here.
6. Click **Chapters** again, then click the **München – Seniorenheim Sonnenhof** row (link "Open München – Seniorenheim Sonnenhof").
7. The report re-scopes to München (URL `?chapter=muenchen`). The sidebar switcher and breadcrumb read "München – Seniorenheim Sonnenhof". All figures, the chart and the map now cover München only. The leaderboard tabs change to **Pilots / Riders**.
8. Scroll back up to the München key figures and hold.

## Rules / notes seen on screen
- The leaderboard tabs depend on the scope. Across chapters it shows Chapters / Countries (Countries only when the scope covers more than one country). Inside one chapter it shows Pilots / Riders.
- Clicking a chapter, on the leaderboard or on the map, re-scopes the whole report to that chapter.
- Movement arrows compare the rank with the previous period. "New" marks entries that weren't ranked before.
- Observed: the All-chapters report showed "Updated 23:52" and the period up to 14 Oct, while the München report showed "Updated 01:53" up to 15 Oct. The cross-chapter report seems to serve cached data from about two hours earlier.
