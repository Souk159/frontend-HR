import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check: pages need a session cookie, otherwise go to /login.
 * Real authorization happens in the Go API on every request.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("yorsys_rt");
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname !== "/login") {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/hr", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // pages only — API routes, Next internals and static files are excluded
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
