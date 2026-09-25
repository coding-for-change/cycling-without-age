import { renderToStaticMarkup } from "react-dom/server";
import en from "@/messages/app/en.json";
import { NotificationBellMenu } from "./notification-bell-menu";
import type { InboxRow } from "./inbox-row";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/features/notifications/actions", () => ({
  markInboxSeen: jest.fn(),
  markNotificationRead: jest.fn(),
}));
jest.mock("@/lib/native/haptics", () => ({ haptics: { tap: jest.fn() } }));

const row = (over: Partial<InboxRow> = {}): InboxRow => ({
  id: "n1",
  category: "application",
  title: "München says welcome",
  body: "Watch the training videos, then meet a captain.",
  href: "/pilot",
  unread: true,
  dateTime: "2026-09-07T09:30:00.000Z",
  when: "2d ago",
  whenExact: "07/09/2026",
  ...over,
});

const render = (rows: InboxRow[], unseen: number) =>
  renderToStaticMarkup(
    <NotificationBellMenu
      rows={rows}
      unseen={unseen}
      strings={en.notifications}
      locale="en"
    />,
  );

describe("NotificationBellMenu", () => {
  it("caps the badge but keeps the real count in the label", () => {
    const html = render([row()], 12);
    expect(html).toContain("Notifications, 12 new");
    expect(html).toContain(">9+<");
  });

  it("shows the plain count below the cap", () => {
    expect(render([row()], 3)).toContain(">3<");
  });

  it("has no badge and no count in the label at zero", () => {
    const html = render([], 0);
    expect(html).not.toContain("new");
    expect(html).toContain('aria-label="Notifications"');
  });
});
