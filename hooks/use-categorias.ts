"use client"

import { useState, useEffect, useCallback } from "react"
import { api, ApiError } from "@/lib/api"

interface UseCategoriasReturn {
  categorias: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCategorias(): UseCategoriasReturn {
  const [categorias, setCategorias] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategorias = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await api.obtenerCategorias()
      setCategorias(result)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Error al cargar categorías")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  return {
    categorias,
    loading,
    error,
    refetch: fetchCategorias,
  }
}
