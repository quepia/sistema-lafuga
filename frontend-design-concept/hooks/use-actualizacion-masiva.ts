"use client"

import { useState, useCallback } from "react"
import { api, Producto, ApiError } from "@/lib/api"

interface UseActualizacionMasivaReturn {
  loading: boolean
  error: string | null
  resultado: { message: string; productos_actualizados: number } | null
  preview: Producto[]
  previewLoading: boolean
  obtenerPreview: (categoria: string) => Promise<void>
  actualizarPorCategoria: (
    categoria: string,
    porcentaje: number,
    aplicarA: "menor" | "mayor" | "ambos"
  ) => Promise<boolean>
  actualizarPorCodigos: (
    codigos: string[],
    porcentaje: number,
    aplicarA: "menor" | "mayor" | "ambos"
  ) => Promise<boolean>
  reset: () => void
}

export function useActualizacionMasiva(): UseActualizacionMasivaReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{
    message: string
    productos_actualizados: number
  } | null>(null)
  const [preview, setPreview] = useState<Producto[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const obtenerPreview = useCallback(async (categoria: string) => {
    setPreviewLoading(true)
    setError(null)

    try {
      const productos = await api.obtenerProductosPorCategoria(categoria)
      setPreview(productos)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Error al cargar productos para preview")
      }
      setPreview([])
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const actualizarPorCategoria = useCallback(
    async (
      categoria: string,
      porcentaje: number,
      aplicarA: "menor" | "mayor" | "ambos"
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResultado(null)

      try {
        const result = await api.actualizarPreciosPorCategoria(
          categoria,
          porcentaje,
          aplicarA
        )
        setResultado(result)
        return true
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Error en actualización masiva")
        }
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const actualizarPorCodigos = useCallback(
    async (
      codigos: string[],
      porcentaje: number,
      aplicarA: "menor" | "mayor" | "ambos"
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResultado(null)

      try {
        const result = await api.actualizarPreciosPorCodigos(
          codigos,
          porcentaje,
          aplicarA
        )
        setResultado(result)
        return true
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Error en actualización masiva")
        }
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setResultado(null)
    setPreview([])
  }, [])

  return {
    loading,
    error,
    resultado,
    preview,
    previewLoading,
    obtenerPreview,
    actualizarPorCategoria,
    actualizarPorCodigos,
    reset,
  }
}
