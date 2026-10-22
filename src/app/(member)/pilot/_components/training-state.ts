import { isTrainingRequired } from "@/lib/feature-flags";
import { ownReadiness } from "@/use-cases/pilot-readiness";
import { summarizeReadiness } from "../training/_components/readiness";

export async function trainingOpen(userId: string, language: string) {
  if (!isTrainingRequired()) return false;
  const own = await ownReadiness(userId, language);
  if (own.chapters.length === 0) return false;
  return !summarizeReadiness(own).ready;
}
