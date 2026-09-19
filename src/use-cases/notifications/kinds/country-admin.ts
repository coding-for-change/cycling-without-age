import { z } from "zod";
import { ORG_NAME } from "@/lib/brand";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { fill } from "@/lib/utils";
import { nameOfCountry, nameOfPerson } from "./lookups";
import { defineKind } from "./types";

const countryAdminKind = (
  event: "countryAdmin.appointed" | "countryAdmin.removed",
  copyKey: "countryAdminAppointed" | "countryAdminRemoved",
) =>
  defineKind({
    event,
    category: "membership",
    policy: { push: true, email: "always", optional: false },
    payload: z.object({
      countryName: z.string().nullable(),
      actorName: z.string().nullable(),
    }),
    recipients: async (event) => [event.userId],
    params: async (event) => {
      const [countryName, actorName] = await Promise.all([
        nameOfCountry(event.countryId),
        nameOfPerson(event.actorUserId),
      ]);
      return { countryName, actorName };
    },
    href: () => PERSPECTIVE_HOME.admin,
    message: ({ countryName, actorName }, strings) => {
      const copy = strings[copyKey];
      const values = {
        country: countryName ?? ORG_NAME,
        actor: actorName ?? ORG_NAME,
      };
      return {
        subject: fill(copy.subject, values),
        preview: copy.preview,
        heading: fill(copy.heading, values),
        body: fill(copy.intro, values),
        cta: copy.cta,
        footer: copy.footer,
        template: copyKey,
      };
    },
  });

export const countryAdminAppointed = countryAdminKind(
  "countryAdmin.appointed",
  "countryAdminAppointed",
);

export const countryAdminRemoved = countryAdminKind(
  "countryAdmin.removed",
  "countryAdminRemoved",
);
