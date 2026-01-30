"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, MovimientoStock, TipoMovimiento, ApiError } from "@/lib/api"

interface UseMovimientosParams {
  producto_id?: string
  tipo_movimiento?: TipoMovimiento
  desde?: string
  hasta?: string
  limit?: number
  offset?: number
  debounceMs?: number
  autoFetch?: boolean
}

interface UseMovimientosReturn {
  movimientos: MovimientoStock[]
  total: number
  loading: boolean
  error: string | null
  offset: number
  refetch: () => Promise<void>
  filtrarPorProducto: (id: string) => void
  filtrarPorTipo: (tipo: TipoMovimiento | undefined) => void
  filtrarPorFecha: (desde?: string, hasta?: string) => void
  cambiarPagina: (offset: number) => void
}

export function useMovimientosStock({
  producto_id: initialProductoId = "",
  tipo_movimiento: initialTipo = undefined,
  desde: initialDesde = undefined,
  hasta: initialHasta = undefined,
  limit = 50,
  offset: initialOffset = 0,
  debounceMs = 300,
  autoFetch = true,
}: UseMovimientosParams = {}): UseMovimientosReturn {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // State for filters
  const [productoId, setProductoId] = useState(initialProductoId)
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento | undefined>(initialTipo)
  const [desde, setDesde] = useState<string | undefined>(initialDesde)
  const [hasta, setHasta] = useState<string | undefined>(initialHasta)
  const [offset, setOffset] = useState(initialOffset)

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const fetchMovimientos = useCallback(async () => {
    // Cancel request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const result = await api.obtenerMovimientos({
        producto_id: productoId || undefined,
        tipo_movimiento: tipoMovimiento,
        desde,
        hasta,
        limit,
        offset,
      })

      setMovimientos(result.movimientos)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error && err.name !== "AbortError") {
        setError("Error al cargar movimientos")
      }
    } finally {
      setLoading(false)
    }
  }, [productoId, tipoMovimiento, desde, hasta, limit, offset])

  // Debounce
  useEffect(() => {
    if (!autoFetch) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchMovimientos()
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchMovimientos, debounceMs, autoFetch])

  const filtrarPorProducto = useCallback((id: string) => {
    setProductoId(id)
    setOffset(0)
  }, [])

  const filtrarPorTipo = useCallback((tipo: TipoMovimiento | undefined) => {
    setTipoMovimiento(tipo)
    setOffset(0)
  }, [])

  const filtrarPorFecha = useCallback((nuevoDesde?: string, nuevoHasta?: string) => {
    setDesde(nuevoDesde)
    setHasta(nuevoHasta)
    setOffset(0)
  }, [])

  const cambiarPagina = useCallback((nuevoOffset: number) => {
    setOffset(nuevoOffset)
  }, [])

  const refetch = useCallback(async () => {
    await fetchMovimientos()
  }, [fetchMovimientos])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    movimientos,
    total,
    loading,
    error,
    offset,
    refetch,
    filtrarPorProducto,
    filtrarPorTipo,
    filtrarPorFecha,
    cambiarPagina,
  }
}
