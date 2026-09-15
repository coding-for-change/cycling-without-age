import { NATIVE_APP } from "@/lib/native-app";

export function GET() {
  return Response.json({
    webcredentials: {
      apps: [`${NATIVE_APP.iosTeamId}.${NATIVE_APP.bundleId}`],
    },
  });
}
