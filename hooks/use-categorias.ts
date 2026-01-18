"use client"

import useSWR from "swr"
import { api, ApiError } from "@/lib/api"

interface UseCategoriasReturn {
  categorias: string[]
  loading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching categories with SWR caching
 * - Categories rarely change, so heavily cached
 * - Persisted to localStorage for instant load on app wake
 */
export function useCategorias(): UseCategoriasReturn {
  const { data, error, isLoading, isValidating, mutate } = useSWR<string[]>(
    "categorias",
    async () => {
      try {
        return await api.obtenerCategorias()
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message)
        }
        throw new Error("Error al cargar categorías")
      }
    },
    {
      // Categories very rarely change, so we can use even longer cache
      dedupingInterval: 300000, // 5 minutes deduplication
      revalidateOnFocus: false,
      // Don't revalidate automatically - categories don't change often
      refreshInterval: 0,
    }
  )

  const refetch = async () => {
    await mutate()
  }

  return {
    categorias: data ?? [],
    // Only show loading on initial load (no cached data)
    loading: isLoading && !data,
    isValidating,
    error: error?.message ?? null,
    refetch,
  }
}
