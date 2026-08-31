import { cookies } from "next/headers";
import type { OnboardingRole } from "@/lib/onboarding";


export const JOIN_PRESET_COOKIE = "cwa.join";
export const JOIN_PRESET_MAX_AGE = 60 * 60;

export type JoinPreset = {
  chapterId: string | null;
  role: OnboardingRole | null;
};

export const EMPTY_PRESET: JoinPreset = { chapterId: null, role: null };

export const encodeJoinPreset = (preset: JoinPreset) =>
  `${preset.chapterId ?? ""}|${preset.role ?? ""}`;

export function parseJoinPreset(value: string | undefined): JoinPreset {
  if (!value) return EMPTY_PRESET;
  const [chapterId = "", role = ""] = value.split("|");
  return {
    chapterId: /^[A-Za-z0-9_-]{1,64}$/.test(chapterId) ? chapterId : null,
    role: role === "pilot" || role === "passenger" ? role : null,
  };
}

export const readJoinPreset = async (): Promise<JoinPreset> =>
  parseJoinPreset((await cookies()).get(JOIN_PRESET_COOKIE)?.value);
