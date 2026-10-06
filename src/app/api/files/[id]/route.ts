import { connection } from "next/server";
import { fleet } from "@/features/fleet";
import { rides } from "@/features/rides";
import { canReadFile, getSession } from "@/lib/auth-guards";
import { extensionOf, fileKindOf, presignGet } from "@/lib/storage";

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
  if (!session)
    return new Response("Unauthorized", { status: 401, headers: PRIVATE });

  const kind = await fileKindOf(id);
  if (!kind) return notFound();
  const found =
    kind === "ridePhoto"
      ? await rides.photoReadRule(id)
      : await fleet.fileReadRule(id);
  if (!found || !canReadFile(session, found.rule)) return notFound();
  const { file } = found;

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
