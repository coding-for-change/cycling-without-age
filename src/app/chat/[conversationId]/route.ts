import { redirect } from "next/navigation";
import { getSession, homeOf } from "@/lib/auth-guards";
import { signInHref } from "@/lib/redirects";

type Params = { params: Promise<{ conversationId: string }> };

const CONVERSATION_ID = /^[a-z0-9]{20,32}$/;

export async function GET(_request: Request, { params }: Params) {
  const { conversationId } = await params;
  const known = CONVERSATION_ID.test(conversationId);

  const session = await getSession();
  if (!session)
    redirect(known ? signInHref(`/chat/${conversationId}`) : "/sign-in");

  const home = homeOf(session);
  redirect(
    known && home !== "/onboarding" ? `${home}/chat/${conversationId}` : home,
  );
}
