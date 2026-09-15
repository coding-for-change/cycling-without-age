import { connection } from "next/server";
import { NATIVE_APP } from "@/lib/native-app";

const fingerprints = () =>
  (process.env.ANDROID_CERT_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((print) => print.trim())
    .filter(Boolean);

export async function GET() {
  await connection();
  const prints = fingerprints();
  return Response.json(
    prints.length === 0
      ? []
      : [
          {
            relation: [
              "delegate_permission/common.handle_all_urls",
              "delegate_permission/common.get_login_creds",
            ],
            target: {
              namespace: "android_app",
              package_name: NATIVE_APP.androidPackage,
              sha256_cert_fingerprints: prints,
            },
          },
        ],
  );
}
