import { z } from "zod";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import { fill } from "@/lib/utils";
import { defineKind } from "./types";

export const countryAdminAppointed = defineKind({
  event: "countryAdmin.appointed",
  category: "membership",
  policy: { push: true, email: "always", optional: false },
  payload: z.object({
    countryName: z.string().nullable(),
    actorName: z.string().nullable(),
  }),
  recipients: async (event) => [event.userId],
  params: async (event) => ({
    countryName: (await chapters.getCountry(event.countryId))?.name ?? null,
    actorName: (await profile.getProfile(event.actorUserId))?.name ?? null,
  }),
  href: () => "/admin",
  message: ({ countryName, actorName }, strings) => {
    const copy = strings.countryAdminAppointed;
    const values = {
      country: countryName ?? "Cycling Without Age",
      actor: actorName ?? "Cycling Without Age",
    };
    return {
      subject: fill(copy.subject, values),
      preview: copy.preview,
      heading: fill(copy.heading, values),
      body: fill(copy.intro, values),
      cta: copy.cta,
      footer: copy.footer,
      template: "countryAdminAppointed",
    };
  },
});
