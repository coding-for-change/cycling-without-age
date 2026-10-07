import {
  Accessibility,
  Brain,
  Ear,
  Glasses,
  HandHelping,
  MessageCircle,
  PersonStanding,
  Snowflake,
  Timer,
  UsersRound,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { AccessibilityTag } from "../schemas";

export const ACCESSIBILITY_ICONS: Record<AccessibilityTag, LucideIcon> = {
  wheelchair: Accessibility,
  walkingAid: PersonStanding,
  helpBoarding: HandHelping,
  hearing: Ear,
  vision: Glasses,
  getsCold: Snowflake,
  bumpSensitive: Waves,
  shortRides: Timer,
  speech: MessageCircle,
  memory: Brain,
  companion: UsersRound,
};
