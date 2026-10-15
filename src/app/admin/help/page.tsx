import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageFallback } from "@/components/page-fallback";
import { requireAdminScope } from "@/lib/auth-guards";
import { docsEntryHref } from "@/lib/docs-auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageBody, AdminPageShell } from "../_components/admin-page";

async function HelpBody() {
  await requireAdminScope();
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const href = docsEntryHref(locale);

  return (
    <AdminPageBody
      page="help"
      action={
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            {dict.admin.pages.help.action}
            <ArrowUpRight aria-hidden />
          </a>
        ) : null
      }
    />
  );
}

export default function HelpPage() {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <HelpBody />
      </Suspense>
    </AdminPageShell>
  );
}
