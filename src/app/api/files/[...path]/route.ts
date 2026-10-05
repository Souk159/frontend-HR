import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE, apiBaseUrl } from "@/lib/server/session";

/**
 * Staff photos: /api/files/<dir>/<file> → Go API /uploads/<dir>/<file>.
 * Only signed-in users get them (faces are personal data), and only from the
 * photo folders — nothing else under /uploads is reachable through here.
 */
const ALLOWED_DIRS = new Set(["staff_photos", "attendance_photos", "attendance"]);
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!request.cookies.has(REFRESH_COOKIE)) {
    return new NextResponse(null, { status: 401 });
  }
  const parts = (await params).path;
  if (parts.length !== 2 || !ALLOWED_DIRS.has(parts[0]) || !SAFE_NAME.test(parts[1]) || parts[1].startsWith(".")) {
    return new NextResponse(null, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/uploads/${parts[0]}/${parts[1]}`, { cache: "no-store" });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("image/")) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": type,
      // file names carry a timestamp, so a stored copy never goes stale
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
