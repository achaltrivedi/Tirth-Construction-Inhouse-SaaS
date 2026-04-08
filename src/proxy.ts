import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedPaths = [
  "/dashboard",
  "/sites",
  "/ledger",
  "/attendance",
  "/workers",
  "/api/export",
];

// Routes that are always public
const publicPaths = ["/login", "/api/auth"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check auth for protected paths
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const session = await auth();
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|logo.png).*)",
  ],
};
