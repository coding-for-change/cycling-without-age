import { renderToStaticMarkup } from "react-dom/server";
import { returnWindow, slotWindow } from "@/features/rides/schemas";
import en from "@/messages/app/en.json";
import { HoursWarnings } from "./hours-warnings";

const ZONE = "Europe/Copenhagen";
const EVENINGS = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  startMinute: 6 * 60,
  endMinute: 24 * 60,
}));

describe("HoursWarnings", () => {
  it("names the closure the way back lands on, not the day the ride leaves", () => {
    const slot = { date: "2026-12-24", start: "21:00", durationMinutes: 120 };
    const html = renderToStaticMarkup(
      <HoursWarnings
        slot={slot}
        returnSlot={returnWindow(slotWindow(slot, ZONE), 90)}
        timeZone={ZONE}
        policy={{
          hours: { windows: EVENINGS, closures: ["2026-12-25"] },
          closureReasons: { "2026-12-25": "Christmas" },
          leadTimeHours: 0,
          horizonDays: 3650,
        }}
        notation="en-GB"
        language="en"
        strings={{
          warnings: en.admin.settings.hours.warnings,
          hours: en.admin.settings.booking.hours,
          days: en.admin.settings.booking.days,
        }}
      />,
    );

    expect(html).toContain("Chapter closed that day: Christmas");
  });
});
