"use client";

/* The admin back-office demo identity: Petra (chapter München) or Ole (super
   admin) — switched from the sidebar. Only read under <AppBoot/> (client). */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AdminRole = "chapter" | "super";

interface AdminSession {
  role: AdminRole;
  chapterId: string;
  setRole: (r: AdminRole) => void;
}

export const useAdminSession = create<AdminSession>()(
  persist(
    (set) => ({
      role: "chapter",
      chapterId: "muc",
      setRole: (role) => set({ role }),
    }),
    { name: "cwa.admin.session" },
  ),
);

export const ADMIN_USERS: Record<AdminRole, { id: string; name: string }> = {
  chapter: { id: "p2", name: "Petra Klein" },
  super: { id: "ole", name: "Ole Kassow" },
};
