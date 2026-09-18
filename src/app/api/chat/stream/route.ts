import { connection } from "next/server";
import { chat } from "@/features/chat";
import { auth } from "@/lib/auth";
import {
  createChatStream,
  presence,
  SSE_HEADERS,
  subscribe,
} from "@/lib/realtime";

export async function GET(request: Request) {
  await connection();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const viewerId = session.user.id;
  const requested = new URL(request.url).searchParams.get("focus");
  const focus =
    requested && (await chat.isMember(requested, viewerId)) ? requested : null;

  const stream = createChatStream({
    userId: viewerId,
    focus,
    contactIds: await chat.listContactUserIds(viewerId),
    subscribe,
    presence,
    signal: request.signal,
    refreshContacts: () => chat.listContactUserIds(viewerId),
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
