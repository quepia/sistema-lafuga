"use client"

import useSWR from "swr"
import { api, Estadisticas, ApiError } from "@/lib/api"

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
    "estadisticas",
    async () => {
      try {
        return await api.obtenerEstadisticas()
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message)
        }
        throw new Error("Error al cargar estadísticas")
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
    // Only show loading on initial load (no cached data)
    loading: isLoading && !data,
    // Indicates background revalidation in progress
    isValidating,
    error: error?.message ?? null,
    refetch,
  }
}
