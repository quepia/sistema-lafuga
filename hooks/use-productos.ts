"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, Producto, ProductosPaginados, ApiError } from "@/lib/api"

interface UseProductosParams {
  query?: string
  categoria?: string
  limit?: number
  offset?: number
  debounceMs?: number
  autoFetch?: boolean
}

interface UseProductosReturn {
  productos: Producto[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  buscar: (query: string) => Promise<void>
  cambiarPagina: (offset: number) => void
  cambiarCategoria: (categoria: string | null) => void
}

export function useProductos({
  query: initialQuery = "",
  categoria: initialCategoria = "",
  limit = 50,
  offset: initialOffset = 0,
  debounceMs = 300,
  autoFetch = true,
}: UseProductosParams = {}): UseProductosReturn {
  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(initialQuery)
  const [categoria, setCategoria] = useState(initialCategoria)
  const [offset, setOffset] = useState(initialOffset)

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const fetchProductos = useCallback(async () => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const result = await api.listarProductos({
        query: query || undefined,
        categoria: categoria || undefined,
        limit,
        offset,
      })

      setProductos(result.productos)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error && err.name !== "AbortError") {
        setError("Error al cargar productos")
      }
    } finally {
      setLoading(false)
    }
  }, [query, categoria, limit, offset])

  // Debounce para búsqueda
  useEffect(() => {
    if (!autoFetch) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchProductos()
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchProductos, debounceMs, autoFetch])

  const buscar = useCallback(async (nuevoQuery: string) => {
    setQuery(nuevoQuery)
    setOffset(0) // Reset pagination on new search
  }, [])

  const cambiarPagina = useCallback((nuevoOffset: number) => {
    setOffset(nuevoOffset)
  }, [])

  const cambiarCategoria = useCallback((nuevaCategoria: string | null) => {
    setCategoria(nuevaCategoria || "")
    setOffset(0) // Reset pagination on category change
  }, [])

  const refetch = useCallback(async () => {
    await fetchProductos()
  }, [fetchProductos])

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
    productos,
    total,
    loading,
    error,
    refetch,
    buscar,
    cambiarPagina,
    cambiarCategoria,
  }
}

// Hook para obtener un producto específico
export function useProducto(id: string | null) {
  const [producto, setProducto] = useState<Producto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id === null || id === '') {
      setProducto(null)
      return
    }

    const fetchProducto = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await api.obtenerProducto(id)
        setProducto(result)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Error al cargar producto")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProducto()
  }, [id])

  return { producto, loading, error }
}

// Hook para actualizar un producto
export function useActualizarProducto() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actualizar = useCallback(
    async (
      id: string,
      datos: { nombre?: string; precio_menor?: number; precio_mayor?: number; costo?: number }
    ): Promise<Producto | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await api.actualizarProducto(id, datos)
        return result
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Error al actualizar producto")
        }
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { actualizar, loading, error }
}
