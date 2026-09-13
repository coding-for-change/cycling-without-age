import { NATIVE_APP } from "@/lib/native-app";

// Apple fetches this to let the app share the site's passkeys. No file
// extension, served as JSON, HTTP 200.
export function GET() {
  return Response.json({
    webcredentials: {
      apps: [`${NATIVE_APP.iosTeamId}.${NATIVE_APP.bundleId}`],
    },
  });
}
