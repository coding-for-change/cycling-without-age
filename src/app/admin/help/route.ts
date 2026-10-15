import { connection } from "next/server";
import { redirect } from "next/navigation";
import { docsEntryHref } from "@/lib/docs-auth";
import { getLocale } from "@/lib/i18n";

export async function GET() {
  await connection();
  redirect(docsEntryHref(await getLocale()));
}
