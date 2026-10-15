import { ProfilePage } from "../../../_components/profile/profile-page";

export default function PilotPersonProfilePage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  return (
    <ProfilePage
      perspective="pilot"
      slug={params.then(({ ref }) => ref)}
    />
  );
}
