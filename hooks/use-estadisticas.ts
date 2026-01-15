"use client"

import { useState, useEffect, useCallback } from "react"
import { api, Estadisticas, ApiError } from "@/lib/api"

interface UseEstadisticasReturn {
  estadisticas: Estadisticas | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEstadisticas(): UseEstadisticasReturn {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEstadisticas = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await api.obtenerEstadisticas()
      setEstadisticas(result)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Error al cargar estadísticas")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstadisticas()
  }, [fetchEstadisticas])

  return {
    estadisticas,
    loading,
    error,
    refetch: fetchEstadisticas,
  }
}
