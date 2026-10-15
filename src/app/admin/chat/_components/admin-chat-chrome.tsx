import { cacheLife } from "next/cache";
import { ChatListSkeleton } from "@/features/chat/components/chat-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
import { ADMIN_LIFE } from "../../admin-viewer";

export async function AdminChatChrome() {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [, dict] = await Promise.all([requireAdminScope(), getDictionary()]);

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden md:h-[calc(100dvh-5rem)] md:flex-none">
      <div className="flex min-h-0 w-full shrink-0 flex-col border-line md:w-[350px] md:border-r">
        <div className="flex shrink-0 items-center gap-3 px-4 pt-4">
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
            {dict.chat.list.title}
          </h1>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <ChatListSkeleton />
      </div>
    </div>
  );
}
