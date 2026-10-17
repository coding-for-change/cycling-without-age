import { redirect } from "next/navigation";
import { rides } from "@/features/rides";
import { isChapterAdmin, isSuperAdmin } from "@/lib/access";
import { getSession, homeOf } from "@/lib/auth-guards";
import { signInHref } from "@/lib/redirects";
import { rideLinkFor } from "@/use-cases/ride-link";

type Params = { params: Promise<{ rideId: string }> };

const RIDE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(_request: Request, { params }: Params) {
  const { rideId } = await params;
  const known = RIDE_ID.test(rideId);

  const session = await getSession();
  if (!session) redirect(known ? signInHref(`/rides/${rideId}`) : "/sign-in");
  if (!known) redirect(homeOf(session));

  const own = await rideLinkFor(rideId, session.user.id);
  if (own) redirect(own);

  const ride = await rides.getRide(rideId);
  if (
    ride &&
    (isSuperAdmin(session.access) ||
      isChapterAdmin(session.access, ride.chapterId, ride.chapter.countryId))
  )
    redirect(`/admin/rides/${rideId}`);

  redirect(homeOf(session));
}
