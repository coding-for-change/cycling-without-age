import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guards";
import {
  docsCallbackUrl,
  docsGroups,
  docsRedirectPath,
  readDocsKey,
  signDocsToken,
} from "@/lib/docs-auth";
import { logDomainEvent } from "@/lib/observability/logger";
import { signInHref } from "@/lib/redirects";

export async function GET(request: Request) {
  await connection();
  const host = process.env.DOCS_HOST;
  const key = readDocsKey(process.env.DOCS_JWT_PRIVATE_KEY);
  if (!host || !key) notFound();

  const target = docsRedirectPath(
    new URL(request.url).searchParams.get("redirect"),
  );

  const session = await getSession();
  if (!session)
    redirect(
      signInHref(
        target
          ? `/docs-login?redirect=${encodeURIComponent(target)}`
          : "/docs-login",
      ),
    );

  const groups = docsGroups(session.access);
  const token = signDocsToken({ key, host, groups, now: Date.now() });

  logDomainEvent(
    { type: "docs.login", actorUserId: session.user.id },
    { group_count: groups.length },
  );

  redirect(docsCallbackUrl({ host, token, redirect: target }));
}
