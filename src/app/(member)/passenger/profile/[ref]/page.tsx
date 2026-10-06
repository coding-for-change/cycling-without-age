import { ProfilePage } from "../../../_components/profile/profile-page";

export default function PassengerPersonProfilePage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  return (
    <ProfilePage
      perspective="passenger"
      slug={params.then(({ ref }) => ref)}
    />
  );
}
