import {
  personProfiles,
  photoUrl,
  subjectSlug,
  type SubjectRef,
} from "@/features/person-profiles";
import { profile } from "@/features/profile";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { visiblePhotoSubjects, type Viewer } from "@/use-cases/person-access";

export type PersonFace = {
  id: string;
  name: string;
  svg: string;
  photoUrl: string | null;
  bio: string | null;
};

export type FacePerson = { id: string; name: string; ref: SubjectRef };

export async function personFaces(
  viewer: Viewer,
  people: FacePerson[],
): Promise<PersonFace[]> {
  if (!people.length) return [];
  const refs = people.map((person) => person.ref);
  const userIds = [
    ...new Set(refs.filter((ref) => ref.kind === "user").map((ref) => ref.id)),
  ];
  const [accounts, profiles, visible] = await Promise.all([
    userIds.length ? profile.getProfiles(userIds) : [],
    personProfiles.getProfiles(refs),
    visiblePhotoSubjects(viewer, refs),
  ]);
  const emailOf = new Map(
    accounts.map((account) => [account.id, account.email]),
  );
  return people.map((person) => {
    const slug = subjectSlug(person.ref);
    const shown = visible.has(slug) ? profiles.get(slug) : undefined;
    const email =
      person.ref.kind === "user" ? emailOf.get(person.ref.id) : undefined;
    return {
      id: person.id,
      name: person.name,
      svg: avatarSvg(
        email ? avatarSeed(email) : `${person.ref.kind}:${person.ref.id}`,
      ),
      photoUrl: photoUrl(shown?.photoFileId ?? null),
      bio: shown?.bio?.trim() || null,
    };
  });
}

export const userFaces = (
  viewer: Viewer,
  users: { id: string; name: string }[],
) =>
  personFaces(
    viewer,
    users.map((user) => ({
      id: user.id,
      name: user.name,
      ref: { kind: "user", id: user.id },
    })),
  );
