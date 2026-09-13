import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { chapters } from "@/features/chapters";

/**
 * The events are global on purpose: the country and every chapter row under it
 * are gone, and a `chapterId` pointing at one would cascade the line away with it.
 */
export async function deleteCountry({
  countryId,
  actorUserId,
}: {
  countryId: string;
  actorUserId: string;
}) {
  const country = await chapters.getCountry(countryId);
  if (!country) throw new DomainError("unknownCountry");

  const inCountry = await chapters.listChapters(countryId);
  await chapters.deleteCountry(countryId);

  await activity.record({
    userId: actorUserId,
    actorUserId,
    type: "countryDeleted",
    payload: { name: country.name, code: country.code },
  });
  for (const chapter of inCountry) {
    await activity.record({
      userId: actorUserId,
      actorUserId,
      type: "chapterDeleted",
      payload: { name: chapter.name, slug: chapter.slug },
    });
  }
}
