import { NextResponse } from "next/server";
import { apiBaseUrl, writeSession, type SessionUser, type TokenPair } from "@/lib/server/session";

// POST /api/auth/login {username, password, business_slug?}
export async function POST(request: Request) {
  let body: { username?: string; password?: string; business_slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (!body.username || !body.password) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }

  let r: Response;
  try {
    r = await fetch(`${apiBaseUrl()}/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") ?? "yorsys-web",
      },
      body: JSON.stringify({
        username: body.username,
        password: body.password,
        business_slug: body.business_slug || process.env.DEFAULT_BUSINESS_SLUG || "",
      }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Cannot reach the Yorsys server." }, { status: 502 });
  }

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return NextResponse.json({ error: data.error ?? "Sign-in failed" }, { status: r.status });
  }

  const user: SessionUser = {
    id: data.user?.id,
    username: data.user?.username,
    full_name: data.user?.full_name,
    role: data.user?.role,
  };
  const res = NextResponse.json({ user });
  writeSession(res, data as TokenPair, user);
  return res;
}
