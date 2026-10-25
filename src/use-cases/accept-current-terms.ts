import { legal } from "@/features/legal";
import { profile } from "@/features/profile";

export const acceptCurrentTerms = (userId: string) =>
  profile.acceptTerms(userId, {
    termsVersion: legal.editionOf("terms").version,
    privacyVersion: legal.editionOf("privacy").version,
  });
