import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET() {
  const startedAt = Date.now()

  try {
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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // La lectura puede continuar aunque una renovación no pueda escribir cookies.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.rpc("obtener_estadisticas_dashboard")

    if (error) {
      console.error("[dashboard-metrics] RPC failed", {
        code: error.code,
        message: error.message,
        durationMs: Date.now() - startedAt,
      })

      const status = error.code === "42501" ? 403 : 502
      return Response.json(
        { error: "No se pudieron obtener las métricas del dashboard." },
        { status }
      )
    }

    console.info("[dashboard-metrics] RPC completed", {
      durationMs: Date.now() - startedAt,
    })

    return Response.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    })
  } catch (error) {
    console.error("[dashboard-metrics] Request failed", {
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    })

    return Response.json(
      { error: "Error de conexión al cargar las métricas." },
      { status: 500 }
    )
  }
}
