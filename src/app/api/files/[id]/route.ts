import { connection } from "next/server";
import { getSession } from "@/lib/auth-guards";
import { extensionOf, presignGet } from "@/lib/storage";
import { publicFile, readableFile } from "@/use-cases/file-access";

const PRIVATE = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const notFound = () =>
  new Response("Not found", { status: 404, headers: PRIVATE });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await params;
  if (!/^[a-z0-9]{1,64}$/i.test(id)) return notFound();

  const session = await getSession();
  const file =
    (session ? await readableFile(session, id) : null) ??
    (await publicFile(id));
  if (!file)
    return session
      ? notFound()
      : new Response("Unauthorized", { status: 401, headers: PRIVATE });

  const url = await presignGet(
    file.key,
    file.mime,
    `${file.id}.${extensionOf(file.mime)}`,
  );
  return new Response(null, {
    status: 302,
    headers: { ...PRIVATE, Location: url },
  });
}
