import { profile } from "@/features/profile";
import { getSession } from "@/lib/auth-guards";
import { DisplayCookieSync } from "./display-cookie-sync";

export async function DisplaySync() {
  const session = await getSession();
  if (!session) return null;
  const person = await profile.getProfile(session.user.id);
  if (!person) return null;
  return (
    <DisplayCookieSync
      textSize={person.textSize}
      reduceMotion={person.reduceMotion}
    />
  );
}
