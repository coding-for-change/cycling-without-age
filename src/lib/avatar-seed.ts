export const avatarSeed = (email: string) => email.trim().toLowerCase();

/**
 * The seed a person's character is drawn from: the one they picked, else their
 * email — so an invite can still draw it before the account exists.
 * `avatarSeed` is required on purpose: a query that forgets to select it
 * should not compile, rather than quietly show the email's character.
 */
export const seedOf = (person: { email: string; avatarSeed: string | null }) =>
  person.avatarSeed ?? avatarSeed(person.email);

export const AVATAR_SEED = /^[A-Za-z0-9_-]{1,64}$/;
