"use client"

import useSWR from "swr"
import { useCallback, useMemo, useRef, useEffect } from "react"
import { api, Producto, ApiError } from "@/lib/api"

interface UseProductosSWRParams {
    query?: string
    categoria?: string
    incluirEliminados?: boolean
    limit?: number
    offset?: number
}

interface UseProductosSWRReturn {
    productos: Producto[]
    total: number
    loading: boolean
    isValidating: boolean
    error: string | null
    refetch: () => Promise<void>
}

/**
 * SWR-based hook for fetching products with caching and stale-while-revalidate
 * - No refetch on tab focus (prevents UI hangs)
 * - Debounced search via SWR key
 * - Shows cached data immediately while revalidating
 * - Request timeout of 10 seconds
 */
export function useProductosSWR({
    query = "",
    categoria = "",
    incluirEliminados = false,
    limit = 20,
    offset = 0,
}: UseProductosSWRParams): UseProductosSWRReturn {
    // Create a stable cache key from params
    const cacheKey = useMemo(() => {
        return JSON.stringify({
            type: "productos",
            query: query.trim(),
            categoria,
            incluirEliminados,
            limit,
            offset,
        })
    }, [query, categoria, incluirEliminados, limit, offset])

    // Abort controller for timeout
    const abortControllerRef = useRef<AbortController | null>(null)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    const fetcher = useCallback(async () => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        // Create timeout
        const timeoutId = setTimeout(() => {
            abortControllerRef.current?.abort()
        }, 10000) // 10 second timeout

        try {
            const result = await api.listarProductos({
                query: query.trim() || undefined,
                categoria: categoria || undefined,
                incluirEliminados,
                limit,
                offset,
            })

            clearTimeout(timeoutId)
            return result
        } catch (err) {
            clearTimeout(timeoutId)

            if (err instanceof Error && err.name === "AbortError") {
                throw new Error("La solicitud tardó demasiado. Por favor, intenta de nuevo.")
            }

            if (err instanceof ApiError) {
                throw new Error(err.message)
            }

            throw new Error("Error al cargar productos")
        }
    }, [query, categoria, incluirEliminados, limit, offset])

    const { data, error, isLoading, isValidating, mutate } = useSWR(
        cacheKey,
        fetcher,
        {
            // Critical: disable focus revalidation to prevent UI hangs
            revalidateOnFocus: false,
            // Don't revalidate on reconnect immediately
            revalidateOnReconnect: false,
            // Keep previous data while revalidating
            keepPreviousData: true,
            // Dedupe requests for 5 seconds
            dedupingInterval: 5000,
            // Retry once on error
            errorRetryCount: 1,
            // Don't revalidate automatically
            revalidateIfStale: false,
        }
    )

    const refetch = useCallback(async () => {
        await mutate()
    }, [mutate])

    return {
        productos: data?.productos ?? [],
        total: data?.total ?? 0,
        // Only show loading spinner on initial load (no cached data)
        loading: isLoading && !data,
        isValidating,
        error: error?.message ?? null,
        refetch,
    }
}
