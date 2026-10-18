import { createHash } from "node:crypto";
import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ALargeSmall,
  Bike,
  MapPin,
  HeartHandshake,
  LifeBuoy,
  MessageCircleHeart,
  Smile,
  UserRound,
} from "lucide-react";
import { loadAccount } from "@/components/account/load-account";
import { SaveStatus } from "@/components/save-status";
import { passengers } from "@/features/passengers";
import { AddRiderDrawer } from "@/features/passengers/components/add-rider-drawer";
import { personProfiles, photoUrl } from "@/features/person-profiles";
import { PhotoField } from "@/features/person-profiles/components/photo-field";
import { profile } from "@/features/profile";
import { resolveAddress, suggestAddresses } from "@/features/profile/actions";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, toIsoDateUtc, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { isPhoneTempEmail } from "@/lib/identity";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import { nameParts } from "@/lib/utils";
import {
  accessPerson,
  canGiveHealthConsent,
  canRemovePhoto,
  canUploadPhoto,
} from "@/use-cases/person-access";
import { getMemberHome } from "@/use-cases/member-home";
import { passengerRideTotals } from "@/use-cases/passenger-rides";
import { ManagedRiders } from "../../../_components/profile/profile-page";
import { AboutMe } from "./about-me";
import { AccountSections } from "./account-area";
import { AvatarPicker } from "./avatar-picker";
import { DisplaySettings } from "./display-settings";
import { EditorScope } from "./editor-scope";
import { Journey, Stop } from "./journey";
import { PersonalDetails } from "./personal-details";

const SUGGESTIONS = 6;

/** The account's housekeeping, after everything that is about the person. */
const CLOSING_SECTIONS = [
  "language",
  "appearance",
  "notifications",
  "calendar",
  "passkeys",
  "support",
  "danger",
] as const;

/**
 * The first characters on offer are derived from the account, not drawn at
 * random: the same six each visit, and nothing random in a server render.
 * "Show others" asks the server for fresh ones.
 */
const firstSuggestions = (userId: string) =>
  Array.from({ length: SUGGESTIONS }, (_, index) => {
    const seed = createHash("sha256")
      .update(`${userId}:${index}`)
      .digest("base64url")
      .slice(0, 12);
    return { seed, svg: avatarSvg(seed) };
  });

/**
 * Main's own profile — photo, the few words, interests, prompts — told as a
 * route from who you are to how the app should know you, with the account's
 * housekeeping at the end. Other people's profiles stay main's `ProfilePage`.
 */
export async function OwnProfile() {
  const session = await requirePerspective("passenger");
  const found = await accessPerson(session, {
    kind: "user",
    id: session.user.id,
  });
  if (!found) notFound();
  const { target, relation } = found;

  const [about, person, own, account, dict, language, head, home, totals] =
    await Promise.all([
      personProfiles.getProfile(target.subject),
      profile.getProfile(session.user.id),
      passengers.getOwnPassenger(session.user.id),
      loadAccount(),
      getDictionary(),
      getLocale(),
      headers(),
      getMemberHome(session.user.id),
      passengerRideTotals(session.user.id),
    ]);
  const s = dict.passenger.profile;
  const strings = dict.personProfile;
  const labels = dict.account.field;
  const email = person?.email ?? session.user.email;
  const picked = person?.avatarSeed ?? null;
  const photo = photoUrl(about.photoFileId);
  const name = person?.name ?? session.user.name;
  const notation = resolveLocale(head.get("accept-language"));
  const voice = notation.startsWith(language) ? notation : language;
  const base = `${PERSPECTIVE_HOME.passenger}/profile`;

  return (
    <EditorScope
      subject={target.subject}
      name={target.name}
      strings={strings}
      labels={labels}
      language={language}
    >
      <div className="flex flex-col gap-9">
        <header className="reveal relative grid justify-items-center gap-3 rounded-(--r-tile) bg-grey-tint p-5 text-center">
          <div className="flex min-h-5 w-full justify-end">
            <SaveStatus
              labels={dict.account.status}
              words={language}
            />
          </div>
          <PhotoField
            avatar={avatarSvg(target.avatarSeed, true)}
            photo={photo}
            canUpload={canUploadPhoto(relation)}
            canRemove={canRemovePhoto(relation)}
          />
          <h1 className="display-title text-3xl">{target.name}</h1>
          <ul className="flex flex-wrap justify-center gap-1.25">
            {[
              { icon: UserRound, label: s.chips.role },
              ...home.chapters.map((chapter) => ({
                icon: MapPin,
                label: chapter.name,
              })),
              {
                icon: Bike,
                label: formatMessage(
                  s.chips.rides,
                  { count: totals.rides },
                  language,
                ),
              },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-bold"
              >
                <Icon
                  aria-hidden
                  className="size-3"
                />
                {label}
              </li>
            ))}
          </ul>
          <p className="text-base text-ink-soft">{s.intro}</p>
        </header>

        <Journey>
          <Stop
            icon={UserRound}
            title={s.account.title}
            hint={s.account.hint}
          >
            <PersonalDetails
              name={name}
              names={own ? nameParts(name, own) : null}
              birthDate={
                person?.birthDate ? toIsoDateUtc(person.birthDate) : null
              }
              age={
                target.birthDate
                  ? personProfiles.ageOn(target.birthDate, new Date())
                  : null
              }
              hideAge={about.hideAge}
              gender={person?.gender ?? null}
              email={isPhoneTempEmail(email) ? null : email}
              phone={person?.phoneNumber ?? null}
              strings={{ ...dict.account.profile, ...s.account }}
              labels={labels}
              notation={notation}
              words={wordsLocale(language)}
            />
          </Stop>

          <Stop
            icon={MessageCircleHeart}
            title={s.about.title}
            hint={strings.visibility}
          >
            <AboutMe
              profile={about}
              showAccessibility={target.ridesThemself}
              canGiveConsent={canGiveHealthConsent(relation, target)}
              dictation={s.about.dictate}
              lang={voice}
            />
          </Stop>

          <Stop
            icon={Smile}
            title={s.avatar.title}
            hint={s.avatar.hint}
          >
            <AvatarPicker
              current={avatarSvg(target.avatarSeed)}
              original={avatarSvg(avatarSeed(email))}
              picked={picked !== null}
              hasPhoto={photo !== null}
              suggestions={firstSuggestions(session.user.id)}
              strings={s.avatar}
            />
          </Stop>

          <Stop
            icon={ALargeSmall}
            title={s.display.textSize}
          >
            <DisplaySettings
              textSize={person?.textSize ?? "normal"}
              reduceMotion={person?.reduceMotion ?? false}
              strings={s.display}
              labels={labels}
              showLegend={false}
            />
          </Stop>

          <Stop
            icon={HeartHandshake}
            title={strings.managed.title}
            hint={strings.managed.body}
          >
            <Suspense fallback={null}>
              <ManagedRiders
                session={session}
                base={base}
                title={strings.managed.title}
                countLabel={strings.managed.count}
                language={language}
                mode="link"
                bare
                add={
                  <AddRiderDrawer
                    strings={{
                      ...dict.profile,
                      ...dict.riders,
                      open: dict.riders.add,
                    }}
                    lookup={{
                      search: suggestAddresses,
                      resolve: resolveAddress,
                    }}
                    locale={language}
                  />
                }
              />
            </Suspense>
          </Stop>

          {account ? (
            <Stop
              icon={LifeBuoy}
              title={s.more.title}
              hint={s.more.hint}
            >
              <AccountSections
                data={account}
                only={CLOSING_SECTIONS}
                perspectiveSwitch
              />
            </Stop>
          ) : null}
        </Journey>
      </div>
    </EditorScope>
  );
}
