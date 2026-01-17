import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const next = searchParams.get("next") ?? "/dashboard"

    console.log(`[Auth Callback] Processing code: ${code?.substring(0, 5)}... in origin: ${origin}`)

    try {
        if (code) {
            const cookieStore = await cookies()
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll()
                        },
                        setAll(cookiesToSet) {
                            try {
                                console.log(`[Auth Callback] Setting cookies: ${cookiesToSet.length}`)
                                cookiesToSet.forEach(({ name, value, options }) =>
                                    cookieStore.set(name, value, options)
                                )
                            } catch (err) {
                                console.error("[Auth Callback] Cookie set error:", err)
                            }
                        },
                    },
                }
            )

            console.log("[Auth Callback] Exchanging code...")
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error) {
                console.log(`[Auth Callback] Success! Redirecting to ${origin}${next}`)
                return NextResponse.redirect(`${origin}${next}`)
            } else {
                console.error("[Auth Callback] Exchange error:", error)
                return NextResponse.redirect(`${origin}/login?error=exchange_failed&message=${error.message}`)
            }
        } else {
            console.warn("[Auth Callback] No code found")
        }
    } catch (e) {
        console.error("[Auth Callback] CRITICAL error:", e)
        return NextResponse.redirect(`${origin}/login?error=server_error`)
    }

    // Fallback
    console.log("[Auth Callback] Fallback redirect")
    return NextResponse.redirect(`${origin}/login?error=no_code`)
}
