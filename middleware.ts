import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  console.log("Middleware - Path:", nextUrl.pathname, "Logged in:", isLoggedIn);

  // Public routes that don't need auth
  const isPublicRoute = ["/", "/login", "/signup"].includes(nextUrl.pathname);
  
  // Protect all routes except public ones
  if (!isPublicRoute && !isLoggedIn) {
    console.log("Redirecting to login");
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // If logged in and trying to access login/signup, redirect to dashboard
  if (isLoggedIn && ["/login", "/signup"].includes(nextUrl.pathname)) {
    console.log("Redirecting to dashboard");
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
