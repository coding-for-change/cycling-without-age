import type { ReactNode } from "react";
import { MemberShell } from "../_components/member-shell";

export default function PassengerLayout({ children }: { children: ReactNode }) {
  return <MemberShell perspective="passenger">{children}</MemberShell>;
}
