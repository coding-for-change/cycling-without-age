# admin-reports

- Account: chapterAdmin (Anke Admin) — figures are the München demo data.
- Start URL: /admin/reports (default timeframe 30D)

1. "Reports" opens on the last 30 days. Toolbar: timeframe buttons "7D", "30D", "90D", "YTD", "12M", "All", a "Custom" date picker, and the line "16 Sept – 15 Oct 2026 · Compared with 17 Aug – 16 Sept 2026" plus "Updated hh:mm".
2. Key figure tiles: "Rides" ("One ride per rider on a trip"), "Trips", "Riders", "Hours", "Cancellations" ("x% of trips"), each with change vs the previous period and a sparkline. Below: chart "Rides — Rides per day" stacked by Event / Pleasure / Functional with a dashed "Previous period" line.
3. Click "90D". Dates switch to "18 Jul – 15 Oct 2026 · Compared with 19 Apr – 18 Jul 2026", the chart becomes "Rides per week" (URL ?range=90d).
4. Click the "Hours" tile. It gets a frame and the chart switches to "Hours — Hours per week".
5. Hover a bar (week of 10 Aug): tooltip "Week of 10 Aug" with Functional / Pleasure / Event, Total, Previous period, "Zoom to 10 Aug – 16 Aug". Hint under the chart: "Click a bar to zoom in".
6. Click the bar. The whole page zooms to 10 Aug – 16 Aug 2026 (the "Custom" button shows that range; the chart becomes "Hours per day"; all tiles and boxes recalculate).
7. Scroll down to "Leaderboard" (toggle "Rides" / "Hours", tabs "Pilots" / "Riders"; top 5 with rank change or "New"). Next to it: "Where the rides happened" map, then "Cancellations", "Ride models", "People".
8. Click "See all". Drawer "All pilots" — "10 Aug – 16 Aug 2026, compared with the period before. Sort by any column." Table columns #, Name, Rides, Trips, Hours, Change; searchable.

Notes:
- "People" counts active = at least one ride in the last 12 months, whatever timeframe is picked.
- Timeframe, metric and zoom live in the URL, so a view can be shared as a link.
