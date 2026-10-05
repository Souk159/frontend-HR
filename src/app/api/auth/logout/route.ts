import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, apiBaseUrl, clearSession } from "@/lib/server/session";

// POST /api/auth/logout — revokes the refresh token server-side, then clears cookies
export async function POST() {
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (refresh) {
    await fetch(`${apiBaseUrl()}/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  clearSession(res);
  return res;
}
