import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/login", "/auth/callback"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Get token from cookie or authorization header
  const token = request.cookies.get("access_token")?.value

  // If trying to access protected route without token, redirect to login
  if (!isPublicRoute && !token) {
    // Check localStorage is not available in middleware, so we rely on cookie
    // The client-side AuthProvider will handle localStorage
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (isPublicRoute && token && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|icon-.*|apple-icon.*).*)",
  ],
}
