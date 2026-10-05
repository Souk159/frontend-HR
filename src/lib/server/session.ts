import "server-only";
import type { NextResponse } from "next/server";

/**
 * Server-side session helpers for the BFF (backend-for-frontend).
 * The Go API's JWT access/refresh tokens live only in httpOnly cookies —
 * browser JavaScript never sees them.
 */

export const ACCESS_COOKIE = "yorsys_at";
export const REFRESH_COOKIE = "yorsys_rt";
export const USER_COOKIE = "yorsys_user"; // non-sensitive display info (name, role)

export function apiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error("API_BASE_URL is not set (see frontend/.env.example)");
  return url.replace(/\/+$/, "");
}

const secure = process.env.NODE_ENV === "production";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // matches backend REFRESH_EXPIRE_DAYS default

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type SessionUser = {
  id: string;
  username: string;
  full_name: string;
  role: string;
};

export function writeSession(res: NextResponse, tokens: TokenPair, user?: SessionUser) {
  res.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, tokens.expires_in - 60),
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
  if (user) {
    res.cookies.set(USER_COOKIE, JSON.stringify(user), {
      httpOnly: false,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_MAX_AGE,
    });
  }
}

export function clearSession(res: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

/** Exchanges a refresh token for a new pair; null when the session is over. */
export async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  try {
    const r = await fetch(`${apiBaseUrl()}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as TokenPair;
  } catch {
    return null;
  }
}
