import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const protectedRoutes: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/vendor": ["VENDOR", "ADMIN"],
  "/agent": ["AGENT", "ADMIN"],
  "/user": ["USER", "ADMIN"],
};

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = Object.keys(protectedRoutes).some(route => path.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const cookieStr = req.cookies.get("session")?.value;
  const session = await decrypt(cookieStr);

  if (!session?.role) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const allowedRoles = Object.entries(protectedRoutes).find(([route]) => path.startsWith(route))?.[1] || [];
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role as string)) {
    // Redirect to their respective dashboard instead of a 403 page if possible
    const fallbackPath = `/${(session.role as string).toLowerCase()}`;
    return NextResponse.redirect(new URL(fallbackPath, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
