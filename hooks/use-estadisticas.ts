"use client"

import useSWR from "swr"
import type { Estadisticas } from "@/lib/api"

const REQUEST_TIMEOUT_MS = 10000

function isEstadisticas(value: unknown): value is Estadisticas {
  if (!value || typeof value !== "object") return false

  const estadisticas = value as Partial<Estadisticas>
  return (
    typeof estadisticas.total_productos === "number" &&
    typeof estadisticas.productos_por_categoria === "object" &&
    estadisticas.productos_por_categoria !== null &&
    typeof estadisticas.productos_sin_precio === "number" &&
    typeof estadisticas.productos_sin_codigo_barra === "number" &&
    typeof estadisticas.promedio_precio_menor === "number" &&
    typeof estadisticas.promedio_precio_mayor === "number" &&
    typeof estadisticas.promedio_costo === "number"
  )
}

async function fetchEstadisticas(signal: AbortSignal): Promise<Estadisticas> {
  const response = await fetch("/api/dashboard-metrics", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  })

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "No se pudieron cargar las métricas."
    throw new Error(message)
  }

  if (!isEstadisticas(body)) {
    throw new Error("El servidor devolvió métricas inválidas.")
  }

  return body
}

interface UseEstadisticasReturn {
  estadisticas: Estadisticas | null
  loading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching statistics with SWR caching
 * - Shows cached/stale data immediately while revalidating in background
 * - No blocking loading states on tab switch
 * - Automatic deduplication of concurrent requests
 */
export function useEstadisticas(): UseEstadisticasReturn {
  const { data, error, isLoading, isValidating, mutate } = useSWR<Estadisticas>(
    "estadisticas-dashboard-v2",
    async () => {
      const controller = new AbortController()
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      try {
        return await Promise.race([
          fetchEstadisticas(controller.signal),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error("Las métricas tardaron demasiado en responder."))
              controller.abort()
            }, REQUEST_TIMEOUT_MS)
          }),
        ])
      } catch (err) {
        if (err instanceof Error && err.message) {
          throw err
        }
        throw new Error("Error al cargar las métricas.")
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    },
    {
      // Statistics don't change frequently, so we can use longer cache
      dedupingInterval: 60000, // 1 minute deduplication
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Don't crash on reconnect
      shouldRetryOnError: false, // Don't infinite loop on error
      errorRetryCount: 1, // Only retry once
    }
  )

  const refetch = async () => {
    await mutate()
  }

  return {
    estadisticas: data ?? null,
    // La consulta tiene un límite explícito: nunca queda cargando para siempre.
    loading: isLoading && !data,
    // Indicates background revalidation in progress
    isValidating,
    error: error?.message ?? null,
    refetch,
  }
}
