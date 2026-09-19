import { activity } from "@/lib/activity";
import { DomainError } from "@/lib/domain-error";
import { chapters } from "@/features/chapters";

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
