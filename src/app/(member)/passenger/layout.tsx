import type { ReactNode } from "react";
import { TextScaleScope } from "../_components/display/text-scale-scope";
import { MemberShell } from "../_components/member-shell";

/**
 * `data-text-scale` marks the pages that follow the passenger's text size
 * (globals.css § Text size), `TextScaleScope` the layers they open; the
 * shell's chrome keeps its pitch.
 */
export default function PassengerLayout({ children }: { children: ReactNode }) {
  return (
    <MemberShell perspective="passenger">
      <TextScaleScope />
      <div
        data-text-scale
        className="contents"
      >
        {children}
      </div>
    </MemberShell>
  );
}
