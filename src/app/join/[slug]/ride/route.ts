import { NextResponse, type NextRequest } from "next/server";

/** Posters and old links still point here; the Ride Request Form took over. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return NextResponse.redirect(
    new URL(
      `/passenger/rides/new?chapter=${encodeURIComponent(slug)}`,
      request.url,
    ),
  );
}
