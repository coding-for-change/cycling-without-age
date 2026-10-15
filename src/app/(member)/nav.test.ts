import en from "@/messages/app/en.json";
import {
  MEMBER_NAV,
  activeItem,
  activeTabKey,
  isConversationPath,
  isDrillDown,
  memberNav,
  nextPerspective,
  primaryAction,
  resolveMemberNav,
} from "./nav";
import type { MemberNavKey } from "./nav";

const LABELS: Record<MemberNavKey, string> = {
  home: "Home",
  rides: "My rides",
  calendar: "Calendar",
  chat: "Chat",
  training: "Training",
  profile: "Profile",
};

const hrefs = (perspective: "pilot" | "passenger") =>
  memberNav(perspective).map((item) => item.href);

const tabs = (perspective: "pilot" | "passenger") =>
  memberNav(perspective)
    .filter((item) => item.tab)
    .map((item) => item.key);

describe("memberNav", () => {
  it("hangs every row off the perspective's own home", () => {
    expect(hrefs("pilot")).toEqual([
      "/pilot",
      "/pilot/rides",
      "/pilot/calendar",
      "/pilot/chat",
      "/pilot/training",
      "/pilot/profile",
    ]);
    expect(hrefs("passenger")).toEqual([
      "/passenger",
      "/passenger/rides",
      "/passenger/calendar",
      "/passenger/chat",
      "/passenger/profile",
    ]);
  });

  it("keeps training to the pilots", () => {
    expect(memberNav("passenger").some((i) => i.key === "training")).toBe(
      false,
    );
  });

  it("shows both perspectives the same four tabs", () => {
    expect(tabs("pilot")).toEqual(["home", "rides", "calendar", "chat"]);
    expect(tabs("passenger")).toEqual(tabs("pilot"));
  });
});

describe("the native tab bar", () => {
  it("gives every tab an SF Symbol of its own", () => {
    const symbols = MEMBER_NAV.filter((row) => row.tab).map(
      (row) => row.symbol,
    );
    expect(symbols).toEqual([
      "house.fill",
      "bicycle",
      "calendar",
      "bubble.left.and.bubble.right.fill",
    ]);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("hides on an open conversation and keeps its lit tab elsewhere", () => {
    const items = resolveMemberNav("passenger", LABELS);
    expect(isConversationPath("/passenger/chat/abc123")).toBe(true);
    expect(activeTabKey("/passenger/chat/abc123", items)).toBe("chat");
    expect(isConversationPath("/passenger/rides/ride-42")).toBe(false);
    expect(activeTabKey("/passenger/rides/ride-42", items)).toBe("rides");
  });
});

describe("resolveMemberNav", () => {
  it("hands the client finished strings, never keys", () => {
    expect(resolveMemberNav("pilot", LABELS)).toEqual([
      {
        key: "home",
        href: "/pilot",
        icon: "home",
        symbol: "house.fill",
        tab: true,
        label: "Home",
      },
      {
        key: "rides",
        href: "/pilot/rides",
        icon: "rides",
        symbol: "bicycle",
        tab: true,
        label: "My rides",
      },
      {
        key: "calendar",
        href: "/pilot/calendar",
        icon: "calendar",
        symbol: "calendar",
        tab: true,
        label: "Calendar",
      },
      {
        key: "chat",
        href: "/pilot/chat",
        icon: "chat",
        symbol: "bubble.left.and.bubble.right.fill",
        tab: true,
        label: "Chat",
      },
      {
        key: "training",
        href: "/pilot/training",
        icon: "training",
        symbol: "graduationcap.fill",
        tab: false,
        parent: "home",
        label: "Training",
      },
      {
        key: "profile",
        href: "/pilot/profile",
        icon: "profile",
        symbol: "person.crop.circle.fill",
        tab: false,
        parent: "home",
        label: "Profile",
      },
    ]);
  });
});

describe("the dictionary and the registry", () => {
  it("names every row, so no tab can render blank", () => {
    for (const { key } of MEMBER_NAV) {
      expect(en.member.nav[key]).toBeTruthy();
    }
  });

  it("has a page title for every destination that is a page of its own", () => {
    for (const key of Object.keys(en.member.pages)) {
      expect(MEMBER_NAV.some((row) => row.key === key)).toBe(true);
    }
  });
});

describe("which row is active", () => {
  const items = resolveMemberNav("pilot", LABELS);
  const title = (pathname: string) => activeItem(pathname, items)?.key ?? null;

  it("lights home only on home itself", () => {
    expect(title("/pilot")).toBe("home");
    expect(activeTabKey("/pilot", items)).toBe("home");
  });

  it("stays on a tab inside its own subtree", () => {
    expect(title("/pilot/rides")).toBe("rides");
    expect(title("/pilot/rides/ride-42")).toBe("rides");
    expect(activeTabKey("/pilot/rides/ride-42", items)).toBe("rides");
  });

  it("titles a nested page itself while its parent tab stays lit", () => {
    expect(title("/pilot/training")).toBe("training");
    expect(activeTabKey("/pilot/training", items)).toBe("home");
  });

  it("answers null outside the shell", () => {
    expect(title("/admin")).toBeNull();
    expect(activeTabKey("/admin/rides", items)).toBeNull();
  });

  it("never lights a pilot row from the passenger shell", () => {
    const passenger = resolveMemberNav("passenger", LABELS);
    expect(activeItem("/pilot/chat", passenger)).toBeNull();
    expect(activeTabKey("/passenger/chat", passenger)).toBe("chat");
  });
});

describe("isDrillDown", () => {
  const pilot = memberNav("pilot");

  it("keeps swipe-back off on every tab root", () => {
    for (const href of [
      "/pilot",
      "/pilot/rides",
      "/pilot/calendar",
      "/pilot/chat",
      "/pilot/chat/",
    ])
      expect(isDrillDown(href, pilot)).toBe(false);
  });

  it("turns it on one level below a tab", () => {
    expect(isDrillDown("/pilot/chat/abc123", pilot)).toBe(true);
    expect(isDrillDown("/pilot/rides/42/finish", pilot)).toBe(true);
  });

  it("treats a page that is not a tab as a drill-down of its parent", () => {
    expect(isDrillDown("/pilot/training", pilot)).toBe(true);
  });

  it("stays off outside the member shell", () => {
    expect(isDrillDown("/admin", pilot)).toBe(false);
    expect(isDrillDown("/passenger/chat/abc", pilot)).toBe(false);
  });
});

describe("isConversationPath", () => {
  it("is true only on an open conversation, where the chrome steps aside", () => {
    expect(isConversationPath("/pilot/chat/abc123")).toBe(true);
    expect(isConversationPath("/passenger/chat/abc123")).toBe(true);
    expect(isConversationPath("/passenger/chat/abc123/")).toBe(true);
  });

  it("leaves the list, the shell and the admin twin alone", () => {
    expect(isConversationPath("/pilot/chat")).toBe(false);
    expect(isConversationPath("/passenger/chat")).toBe(false);
    expect(isConversationPath("/pilot")).toBe(false);
    expect(isConversationPath("/pilot/rides/ride-42")).toBe(false);
    expect(isConversationPath("/admin/chat/abc123")).toBe(false);
  });

  it("stops at one segment, so nothing deeper hides the chrome by accident", () => {
    expect(isConversationPath("/pilot/chat/abc123/info")).toBe(false);
  });
});

describe("primaryAction", () => {
  it("points the one red button at the rides of that perspective", () => {
    expect(primaryAction("pilot")).toEqual({
      href: "/pilot/rides",
      icon: "rides",
    });
    expect(primaryAction("passenger")).toEqual({
      href: "/passenger/rides",
      icon: "rides",
    });
  });
});

describe("nextPerspective", () => {
  it("rotates in the order the hats were offered, and wraps", () => {
    expect(nextPerspective(["admin", "pilot"], "admin")).toBe("pilot");
    expect(nextPerspective(["admin", "pilot"], "pilot")).toBe("admin");
    expect(nextPerspective(["admin", "pilot", "passenger"], "pilot")).toBe(
      "passenger",
    );
    expect(nextPerspective(["admin", "pilot", "passenger"], "passenger")).toBe(
      "admin",
    );
  });

  it("has nowhere to go with one hat or none", () => {
    expect(nextPerspective([], "pilot")).toBeNull();
    expect(nextPerspective(["pilot"], "pilot")).toBeNull();
  });

  it("refuses to rotate from a hat this person does not hold", () => {
    expect(nextPerspective(["admin", "pilot"], "passenger")).toBeNull();
  });
});
