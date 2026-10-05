import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  apiBaseUrl,
  clearSession,
  refreshTokens,
  writeSession,
  type TokenPair,
} from "@/lib/server/session";

/**
 * Authenticated proxy: /api/v1/* → Go API /v1/*.
 * Adds the bearer token from the httpOnly cookie and, when the access token
 * has expired, rotates it once with the refresh token and retries.
 */
async function forward(request: NextRequest, path: string[]) {
  const target = `${apiBaseUrl()}/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

  const call = (token: string | undefined) => {
    const headers = new Headers();
    const ct = request.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
    headers.set("Accept", request.headers.get("accept") ?? "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(target, { method: request.method, headers, body, cache: "no-store" });
  };

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: TokenPair | null = null;

  if (!access && refresh) {
    rotated = await refreshTokens(refresh);
    access = rotated?.access_token;
  }

  let upstream: Response;
  try {
    upstream = await call(access);
    if (upstream.status === 401 && refresh && !rotated) {
      rotated = await refreshTokens(refresh);
      if (rotated) upstream = await call(rotated.access_token);
    }
  } catch {
    return NextResponse.json({ error: "Cannot reach the Yorsys server." }, { status: 502 });
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      ...(upstream.headers.get("content-disposition")
        ? { "Content-Disposition": upstream.headers.get("content-disposition")! }
        : {}),
    },
  });
  if (rotated) writeSession(res, rotated);
  else if (upstream.status === 401 && refresh) clearSession(res);
  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
