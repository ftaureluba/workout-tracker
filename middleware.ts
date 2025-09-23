
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isLoggedIn = !!req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Public routes that don't need auth
    const isPublicRoute = ["/", "/login", "/signup"].includes(pathname);

    // Protect all routes except public ones
    if (!isPublicRoute && !isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // If logged in and trying to access login/signup, redirect to dashboard
    if (isLoggedIn && ["/login", "/signup"].includes(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
