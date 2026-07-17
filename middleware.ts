import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!session && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublicPath) {
    const dest = session.role === "Admin" ? "/admin/dashboard" : "/staff/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Role-based route protection: /admin/* is Admin-only, /staff/* is Store
  // Staff-only. A signed-in user of the wrong role gets sent to their own
  // dashboard instead of a dead end.
  if (session && pathname.startsWith("/admin") && session.role !== "Admin") {
    return NextResponse.redirect(new URL("/staff/dashboard", req.url));
  }
  if (session && pathname.startsWith("/staff") && session.role !== "Store Staff") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|mp4|webm|ogg)$).*)",
  ],
};