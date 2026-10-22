const SUPERADMIN = "superadmin";
const BASE_ROLE = "user";

const rolesOf = (role: string | null | undefined) =>
  (role ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

export const hasSuperadminRole = (role: string | null | undefined) =>
  rolesOf(role).includes(SUPERADMIN);

export const withSuperadmin = (role: string | null | undefined) =>
  [
    ...rolesOf(role).filter(
      (name) => name !== BASE_ROLE && name !== SUPERADMIN,
    ),
    SUPERADMIN,
  ].join(",");

export const withoutSuperadmin = (role: string | null | undefined) => {
  const rest = rolesOf(role).filter((name) => name !== SUPERADMIN);
  return rest.length > 0 ? rest.join(",") : BASE_ROLE;
};
