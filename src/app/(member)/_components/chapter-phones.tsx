import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

export type ChapterPhone = {
  userId: string;
  name: string;
  phoneNumber: string;
};

const dialable = (phone: string) => phone.replace(/[^\d+]/g, "");

export function ChapterPhones({
  phones,
  call,
  words,
}: {
  phones: ChapterPhone[];
  call: string;
  words: Locale;
}) {
  const callable = phones.filter((phone) => dialable(phone.phoneNumber));
  if (!callable.length) return null;
  return (
    <ul className="flex flex-col gap-1.25">
      {callable.map((phone) => (
        <li key={phone.userId}>
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-11 w-full justify-start rounded-full border-line px-4 sm:w-fit"
          >
            <a
              href={`tel:${dialable(phone.phoneNumber)}`}
              aria-label={formatMessage(call, { name: phone.name }, words)}
            >
              <Phone aria-hidden />
              <span className="truncate font-medium">{phone.name}</span>
              <span className="text-ink-soft tabular-nums">
                {phone.phoneNumber}
              </span>
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}
