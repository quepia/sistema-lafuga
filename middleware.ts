import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;

    // 1. If not authenticated and trying to access protected route -> Login
    // Protected: /dashboard
    if (path.startsWith("/dashboard") && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // 2. If authenticated, check whitelist
    if (user) {
        // Check if user is in authorized_users
        // We can do this efficiently by selecting just the role
        const { data: authorizedUser } = await supabase
            .from("authorized_users")
            .select("role")
            .eq("email", user.email!)
            .single();

        const isAuthorized = !!authorizedUser;

        // If accessing dashboard but not authorized -> Unauthorized page
        if (path.startsWith("/dashboard") && !isAuthorized) {
            return NextResponse.redirect(new URL("/unauthorized", request.url));
        }

        // If accessing /login but authorized -> Dashboard
        if (path === "/login" && isAuthorized) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // If accessing /unauthorized but IS authorized -> Dashboard (optional, good UX)
        if (path === "/unauthorized" && isAuthorized) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - auth/callback (important for OAuth)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
