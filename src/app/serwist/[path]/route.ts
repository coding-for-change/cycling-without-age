import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import { cacheLife } from "next/cache";

const revision =
  process.env.SENTRY_RELEASE ||
  spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() ||
  "unversioned";

const serwist = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});

export const generateStaticParams = serwist.generateStaticParams;

async function serwistPaths() {
  "use cache";
  cacheLife("max");
  return (await generateStaticParams()).map((entry) => entry.path);
}

async function serwistFile(path: string) {
  "use cache";
  cacheLife("max");
  const response = await serwist.GET(new Request("http://localhost"), {
    params: Promise.resolve({ path }),
  });
  return {
    body: await response.text(),
    contentType: response.headers.get("Content-Type") ?? "text/plain",
  };
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/serwist/[path]">,
) {
  const { path } = await params;
  if (!(await serwistPaths()).includes(path)) {
    return new Response(null, { status: 404 });
  }
  const file = await serwistFile(path);
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Service-Worker-Allowed": "/",
    },
  });
}
