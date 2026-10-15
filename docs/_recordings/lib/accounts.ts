export const ACCOUNTS = {
  superadmin: "superadmin@cwa.local",
  country: "country.de@cwa.local",
  chapterAdmin: "admin.muenchen@cwa.local",
  pilot: "pilot@cwa.local",
  passenger: "passenger@cwa.local",
  caretaker: "caretaker@cwa.local",
} as const;

export type Account = keyof typeof ACCOUNTS;

export const ADMIN_ACCOUNTS: Account[] = [
  "superadmin",
  "country",
  "chapterAdmin",
];

export const statePath = (account: Account) =>
  `${__dirname}/../.auth/${account}.json`;
