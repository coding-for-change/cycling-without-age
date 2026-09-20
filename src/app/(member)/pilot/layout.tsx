import type { ReactNode } from "react";
import { MemberShell } from "../_components/member-shell";

export default function PilotLayout({ children }: { children: ReactNode }) {
  return <MemberShell perspective="pilot">{children}</MemberShell>;
}
