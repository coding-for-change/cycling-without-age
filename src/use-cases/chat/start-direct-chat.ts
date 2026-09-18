import { contact as contactSchema } from "@/features/accounts/schemas";
import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { membership } from "@/features/membership";
import { profile } from "@/features/profile";
import {
  hasAnyAdminScope,
  hasChapterRole,
  isCountryAdmin,
  isSuperAdmin,
} from "@/lib/access";
import type { Access } from "@/lib/access";
import { DomainError } from "@/lib/domain-error";

export type ContactPerson = { userId: string; name: string; email: string };

export type PersonMatch = ContactPerson & {
  chapterId: string | null;
  chapterName: string | null;
};

export const PEOPLE_SEARCH_LIMIT = 5;
export const PEOPLE_SEARCH_MIN_CHARS = 2;

export type ContactInput = {
  viewerUserId: string;
  viewerAccess: Access;
  contact: string;
};

type Reach = { reachable: boolean; chapterId: string | null };

async function reachOf(
  { viewerUserId, viewerAccess }: Omit<ContactInput, "contact">,
  targetUserId: string,
): Promise<Reach> {
  const [mine, theirs] = await Promise.all([
    membership.listMembershipsOfUser(viewerUserId),
    membership.listMembershipsOfUser(targetUserId),
  ]);

  const ours = new Set(mine.map((m) => m.chapterId));
  const shared = theirs.find((m) => ours.has(m.chapterId))?.chapterId ?? null;
  if (shared) return { reachable: true, chapterId: shared };

  if (isSuperAdmin(viewerAccess)) return { reachable: true, chapterId: null };
  if (theirs.some((m) => hasChapterRole(viewerAccess, m.chapterId, "admin")))
    return { reachable: true, chapterId: null };
  if (viewerAccess.countryAdminOf.length === 0)
    return { reachable: false, chapterId: null };

  const countryIds = await Promise.all(
    theirs.map((m) => chapters.getChapterCountryId(m.chapterId)),
  );
  return {
    reachable: countryIds.some(
      (countryId) =>
        countryId !== null && isCountryAdmin(viewerAccess, countryId),
    ),
    chapterId: null,
  };
}

async function assertReachable(
  viewer: Omit<ContactInput, "contact">,
  targetUserId: string,
): Promise<{ person: ContactPerson; chapterId: string | null }> {
  if (targetUserId === viewer.viewerUserId) throw new DomainError("self");

  const account = await profile.getProfile(targetUserId);
  if (!account) throw new DomainError("notFound");

  const { reachable, chapterId } = await reachOf(viewer, targetUserId);
  // Only an admin is told that an account exists but is out of reach; for everyone else both answers collapse, so chat lookup cannot confirm who has an account.
  if (!reachable)
    throw new DomainError(
      hasAnyAdminScope(viewer.viewerAccess) ? "notReachable" : "notFound",
    );

  return {
    person: { userId: targetUserId, name: account.name, email: account.email },
    chapterId,
  };
}

async function findReachable({
  viewerUserId,
  viewerAccess,
  contact,
}: ContactInput): Promise<{ person: ContactPerson; chapterId: string | null }> {
  const parsed = contactSchema.safeParse(contact);
  if (!parsed.success) throw new DomainError("notFound");

  const targetUserId = parsed.data.startsWith("+")
    ? await profile.getUserIdByPhone(parsed.data)
    : await profile.getUserIdByEmail(parsed.data);
  if (!targetUserId) throw new DomainError("notFound");

  return assertReachable({ viewerUserId, viewerAccess }, targetUserId);
}

async function reachableChapterIds({
  viewerUserId,
  viewerAccess,
}: Omit<ContactInput, "contact">): Promise<string[]> {
  const mine = await membership.listMembershipsOfUser(viewerUserId);
  const ids = new Set(mine.map((m) => m.chapterId));
  const countries = await Promise.all(
    viewerAccess.countryAdminOf.map((countryId) =>
      chapters.listChapters(countryId),
    ),
  );
  for (const list of countries) for (const chapter of list) ids.add(chapter.id);
  return [...ids];
}

async function withChapterNames(
  matches: Omit<PersonMatch, "chapterName">[],
): Promise<PersonMatch[]> {
  const ids = [
    ...new Set(
      matches.flatMap((m) => (m.chapterId === null ? [] : [m.chapterId])),
    ),
  ];
  const names = new Map(
    (ids.length === 0 ? [] : await chapters.getChapters(ids)).map((c) => [
      c.id,
      c.name,
    ]),
  );
  return matches.map((m) => ({
    ...m,
    chapterName: m.chapterId === null ? null : (names.get(m.chapterId) ?? null),
  }));
}

export type SearchInput = {
  viewerUserId: string;
  viewerAccess: Access;
  query: string;
};

export async function searchPeople({
  viewerUserId,
  viewerAccess,
  query,
}: SearchInput): Promise<PersonMatch[]> {
  const trimmed = query.trim();
  const viewer = { viewerUserId, viewerAccess };

  if (contactSchema.safeParse(trimmed).success) {
    try {
      const { person, chapterId } = await findReachable({
        ...viewer,
        contact: trimmed,
      });
      return withChapterNames([{ ...person, chapterId }]);
    } catch (error) {
      if (error instanceof DomainError) return [];
      throw error;
    }
  }

  if (trimmed.length < PEOPLE_SEARCH_MIN_CHARS) return [];
  const opts = { limit: PEOPLE_SEARCH_LIMIT, excludeUserId: viewerUserId };

  if (isSuperAdmin(viewerAccess)) {
    const rows = await profile.searchProfilesByName(trimmed, opts);
    return rows.map((row) => ({
      userId: row.id,
      name: row.name,
      email: row.email,
      chapterId: null,
      chapterName: null,
    }));
  }

  const chapterIds = await reachableChapterIds(viewer);
  return withChapterNames(
    await membership.searchMembersByName(chapterIds, trimmed, opts),
  );
}

export async function startDirectChatWithUser({
  viewerUserId,
  viewerAccess,
  targetUserId,
}: Omit<ContactInput, "contact"> & {
  targetUserId: string;
}): Promise<{ conversationId: string }> {
  const { person, chapterId } = await assertReachable(
    { viewerUserId, viewerAccess },
    targetUserId,
  );
  const { conversation } = await chat.getOrCreateDirect({
    userIds: [viewerUserId, person.userId],
    chapterId,
    createdByUserId: viewerUserId,
  });
  return { conversationId: conversation.id };
}

export const lookupContact = async (
  input: ContactInput,
): Promise<ContactPerson> => (await findReachable(input)).person;

export async function startDirectChat(
  input: ContactInput,
): Promise<{ conversationId: string }> {
  const { person, chapterId } = await findReachable(input);
  const { conversation } = await chat.getOrCreateDirect({
    userIds: [input.viewerUserId, person.userId],
    chapterId,
    createdByUserId: input.viewerUserId,
  });
  return { conversationId: conversation.id };
}
