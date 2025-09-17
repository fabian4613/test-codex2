import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  if (process.env.TEST_AUTH === "1" || process.env.TEST_AUTH === "true") {
    return NextResponse.next();
  }
  const requireAuth = process.env.AUTH_REQUIRED === "1" || process.env.AUTH_REQUIRED === "true";
  if (!requireAuth) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // Allow Next internals and auth endpoints
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public/")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/auth/signin";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
