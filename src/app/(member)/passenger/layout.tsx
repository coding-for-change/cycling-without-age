import type { ReactNode } from "react";
import { MemberShell } from "../_components/member-shell";

/**
 * `data-text-scale` marks the pages that follow the passenger's text size
 * (globals.css § Text size); the shell's chrome keeps its pitch.
 */
export default function PassengerLayout({ children }: { children: ReactNode }) {
  return (
    <MemberShell perspective="passenger">
      <div
        data-text-scale
        className="contents"
      >
        {children}
      </div>
    </MemberShell>
  );
}
