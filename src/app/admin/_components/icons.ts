import {
  Armchair,
  Bike,
  ChartNoAxesColumn,
  CircleQuestionMark,
  Globe,
  Languages,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessagesSquare,
  PanelLeft,
  Route,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/commands";

/**
 * The client half of the icon contract. `Record<IconKey, …>` is the point: a new
 * `IconKey` that nobody drew is a type error here rather than a blank square in
 * the sidebar.
 */
export const ICONS: Record<IconKey, LucideIcon> = {
  overview: LayoutDashboard,
  rides: Route,
  members: Users,
  passengers: Armchair,
  bikes: Bike,
  chat: MessagesSquare,
  reports: ChartNoAxesColumn,
  chapters: MapPinned,
  countries: Globe,
  settings: Settings,
  help: CircleQuestionMark,
  admin: ShieldCheck,
  pilot: Bike,
  passenger: Armchair,
  language: Languages,
  sidebar: PanelLeft,
  signOut: LogOut,
};
