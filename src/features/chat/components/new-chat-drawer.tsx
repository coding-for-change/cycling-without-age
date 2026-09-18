"use client";

import { useCallback, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AppDrawer, submitOnCmdEnter } from "@/components/app-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import { haptics } from "@/lib/native/haptics";
import { fill } from "@/lib/utils";
import {
  createGroupChatAction,
  startDirectChatAction,
  type CreateGroupChatError,
  type PeopleSearchError,
  type PersonSuggestion,
  type StartDirectChatError,
} from "../actions";
import { GROUP_ANNOUNCEMENT_THRESHOLD } from "../schemas";
import { ChatAvatar } from "./chat-avatar";
import { PeopleSearch } from "./people-search";
import type { ChatErrorStrings, ChatNewChatStrings } from "./strings";

export function NewChatDrawer({
  home,
  chapters,
  strings,
  errors,
}: {
  home: string;
  chapters: { id: string; name: string }[];
  strings: ChatNewChatStrings;
  errors: ChatErrorStrings;
}) {
  const router = useRouter();
  const { creating, close } = useDrawerParam();
  const [pending, startTransition] = useTransition();

  const [selected, setSelected] = useState<PersonSuggestion | null>(null);
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<PersonSuggestion[]>([]);

  const startMessage = (error: StartDirectChatError) =>
    error === "notFound"
      ? strings.notFound
      : error === "notReachable"
        ? strings.notReachable
        : error === "self"
          ? strings.self
          : error === "rateLimited"
            ? errors.rateLimited
            : errors.generic;

  const groupMessage = (error: CreateGroupChatError) =>
    error === "notReachable"
      ? strings.notReachable
      : error === "tooFew"
        ? strings.tooFew
        : error === "tooMany"
          ? strings.tooMany
          : error === "rateLimited"
            ? errors.rateLimited
            : strings.generic;

  const onSearchError = useCallback(
    (error: PeopleSearchError) =>
      toast.error(
        error === "rateLimited" ? errors.rateLimited : errors.generic,
      ),
    [errors.rateLimited, errors.generic],
  );

  const reset = () => {
    setSelected(null);
    setMembers([]);
    setTitle("");
  };

  const onOpenChange = (open: boolean) => {
    if (open) return;
    reset();
    close();
  };

  const addMember = (person: PersonSuggestion) =>
    setMembers((current) =>
      current.some((entry) => entry.userId === person.userId)
        ? current
        : [...current, person],
    );

  const startDirect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    startTransition(async () => {
      const result = await startDirectChatAction({ userId: selected.userId });
      if (!result.ok) {
        haptics.error();
        toast.error(startMessage(result.error));
        return;
      }
      haptics.success();
      reset();
      close();
      router.push(`${home}/chat/${result.conversationId}`);
    });
  };

  const createGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createGroupChatAction({
        title: title.trim(),
        chapterId,
        memberUserIds: members.map((entry) => entry.userId),
      });
      if (!result.ok) {
        haptics.error();
        toast.error(groupMessage(result.error));
        return;
      }
      haptics.success();
      reset();
      close();
      router.push(`${home}/chat/${result.conversationId}`);
    });
  };

  const headcount = members.length + 1;
  const searchStrings = {
    searching: strings.searching,
    noMatches: strings.noMatches,
  };

  return (
    <AppDrawer
      open={creating}
      onOpenChange={onOpenChange}
      title={strings.title}
    >
      <Tabs defaultValue="person">
        <TabsList className="w-full">
          <TabsTrigger value="person">{strings.person}</TabsTrigger>
          <TabsTrigger value="group">{strings.group}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="person"
          className="pt-4"
        >
          <form
            onSubmit={startDirect}
            onKeyDown={submitOnCmdEnter}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chat-person">{strings.searchLabel}</Label>
              {selected ? (
                <div className="flex items-center gap-3 rounded-lg bg-canvas-deep py-2 pr-2 pl-3">
                  <ChatAvatar svg={selected.avatarSvg} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {selected.name}
                    </span>
                    {selected.subtitle ? (
                      <span className="truncate text-2sm text-ink-soft">
                        {selected.subtitle}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(null)}
                  >
                    {strings.change}
                  </Button>
                </div>
              ) : (
                <PeopleSearch
                  id="chat-person"
                  placeholder={strings.searchPlaceholder}
                  strings={searchStrings}
                  onPick={setSelected}
                  onError={onSearchError}
                />
              )}
            </div>

            <Button
              type="submit"
              variant="brand"
              disabled={pending || !selected}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {strings.startChat}
            </Button>
          </form>
        </TabsContent>

        <TabsContent
          value="group"
          className="pt-4"
        >
          <form
            onSubmit={createGroup}
            onKeyDown={submitOnCmdEnter}
            className="flex flex-col gap-4"
          >
            {chapters.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="chat-group-chapter">{strings.chapter}</Label>
                <Select
                  value={chapterId}
                  onValueChange={setChapterId}
                >
                  <SelectTrigger id="chat-group-chapter">
                    <SelectValue placeholder={strings.chapter} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter) => (
                      <SelectItem
                        key={chapter.id}
                        value={chapter.id}
                      >
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chat-group-title">{strings.groupTitle}</Label>
              <Input
                id="chat-group-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={strings.groupTitlePlaceholder}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chat-group-member">{strings.addPeople}</Label>
              <PeopleSearch
                id="chat-group-member"
                placeholder={strings.searchPlaceholder}
                strings={searchStrings}
                excludeUserIds={members.map((entry) => entry.userId)}
                onPick={addMember}
                onError={onSearchError}
              />
            </div>

            {members.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {members.map((person) => (
                  <li key={person.userId}>
                    <span className="flex items-center gap-2 rounded-full bg-canvas-deep py-1 pr-1 pl-2 text-2sm">
                      <ChatAvatar
                        svg={person.avatarSvg}
                        size="sm"
                      />
                      <span className="max-w-32 truncate">{person.name}</span>
                      <button
                        type="button"
                        aria-label={person.name}
                        onClick={() =>
                          setMembers((current) =>
                            current.filter(
                              (entry) => entry.userId !== person.userId,
                            ),
                          )
                        }
                        className="grid size-5 place-items-center rounded-full text-ink-soft hover:bg-canvas-deeper hover:text-ink"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="text-2sm text-ink-soft">
              {fill(strings.people, { count: headcount })}
            </p>

            {headcount > GROUP_ANNOUNCEMENT_THRESHOLD ? (
              <p className="rounded-lg bg-mint-tint px-3 py-2 text-2sm text-ink">
                {strings.announcementHint}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="brand"
              disabled={pending || title.trim().length === 0 || !chapterId}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              {strings.createGroup}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </AppDrawer>
  );
}
