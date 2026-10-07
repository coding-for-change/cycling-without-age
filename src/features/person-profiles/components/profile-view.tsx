import { PersonAvatar } from "@/components/person-avatar";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { ACCESSIBILITY_GROUPS, photoUrl } from "../schemas";
import type { PublicProfile } from "../facade";
import { ACCESSIBILITY_ICONS } from "./accessibility-icons";

export type ProfileStrings = Dictionary["personProfile"];

export function ProfileHero({
  name,
  avatar,
  photo,
  age,
  strings,
  language,
  children,
}: {
  name: string;
  avatar: string;
  photo: string | null;
  age: number | null;
  strings: ProfileStrings;
  language: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="grid justify-items-center gap-3 text-center">
      <PersonAvatar
        svg={avatar}
        photoUrl={photo}
        className="size-28 ring-4 ring-mint-tint"
      />
      <div className="grid gap-1">
        <h1 className="text-2xl tracking-tight md:text-3xl">{name}</h1>
        {age !== null ? (
          <p className="text-sm text-ink-soft">
            {formatMessage(strings.age, { age }, language)}
          </p>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function ProfileSection({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3 border-t border-line pt-5", className)}>
      <div className="grid gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.25 rounded-full bg-mint-tint px-3 text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProfileView({
  name,
  avatar,
  profile,
  showAccessibility,
  strings,
  language,
  hero = true,
}: {
  name: string;
  avatar: string;
  profile: PublicProfile;
  showAccessibility: boolean;
  strings: ProfileStrings;
  language: string;
  hero?: boolean;
}) {
  const interests = [
    ...profile.interests.map((key) => strings.interests.options[key]),
    ...profile.customInterests,
  ];
  const tags = showAccessibility ? profile.accessibilityTags : [];
  const empty =
    !profile.bio &&
    interests.length === 0 &&
    profile.prompts.length === 0 &&
    tags.length === 0;

  return (
    <div className="grid gap-5">
      {hero ? (
        <ProfileHero
          name={name}
          avatar={avatar}
          photo={photoUrl(profile.photoFileId)}
          age={profile.age}
          strings={strings}
          language={language}
        >
          {profile.bio ? (
            <p className="max-w-md text-base">{profile.bio}</p>
          ) : null}
        </ProfileHero>
      ) : null}

      {!hero && (profile.bio || profile.age !== null) ? (
        <div className="grid gap-1">
          {profile.age !== null ? (
            <p className="text-sm text-ink-soft">
              {formatMessage(strings.age, { age: profile.age }, language)}
            </p>
          ) : null}
          {profile.bio ? <p className="max-w-prose">{profile.bio}</p> : null}
        </div>
      ) : null}

      {empty ? (
        <p className={cn("text-sm text-ink-soft", hero && "text-center")}>
          {formatMessage(strings.nothingYet, { name }, language)}
        </p>
      ) : null}

      {interests.length > 0 ? (
        <ProfileSection title={strings.interests.label}>
          <div className="flex flex-wrap gap-1.25">
            {interests.map((label) => (
              <Chip key={label}>{label}</Chip>
            ))}
          </div>
        </ProfileSection>
      ) : null}

      {profile.prompts.length > 0 ? (
        <ProfileSection title={strings.prompts.label}>
          <ul className="grid gap-3">
            {profile.prompts.map((prompt) => (
              <li
                key={prompt.key}
                className="grid gap-1 rounded-2xl bg-canvas-deep p-4"
              >
                <span className="text-xs font-medium text-ink-soft">
                  {strings.prompts.options[prompt.key]}
                </span>
                <span className="text-base">{prompt.answer}</span>
              </li>
            ))}
          </ul>
        </ProfileSection>
      ) : null}

      {tags.length > 0 ? (
        <ProfileSection title={strings.accessibility.label}>
          <div className="flex flex-wrap gap-1.25">
            {Object.values(ACCESSIBILITY_GROUPS)
              .flat()
              .filter((tag) => tags.includes(tag))
              .map((tag) => {
                const Icon = ACCESSIBILITY_ICONS[tag];
                return (
                  <Chip key={tag}>
                    <Icon
                      aria-hidden
                      className="size-4"
                    />
                    {strings.accessibility.tags[tag]}
                  </Chip>
                );
              })}
          </div>
        </ProfileSection>
      ) : null}
    </div>
  );
}
