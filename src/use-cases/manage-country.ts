import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { chapters } from "@/features/chapters";
import { training } from "@/features/training";

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
  const media = await training.ownerMedia({
    chapterIds: inCountry.map((chapter) => chapter.id),
    countryIds: [countryId],
  });
  await chapters.deleteCountry(countryId);
  await training.purgeOwnerMedia(media, actorUserId);

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
  return { chapterIds: inCountry.map((chapter) => chapter.id) };
}
