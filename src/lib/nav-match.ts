export const matchesPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
