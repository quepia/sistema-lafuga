"use client"

import { useState, useEffect, useCallback } from "react"
import { api, AlertaStock, ApiError } from "@/lib/api"

interface KPIs {
  totalAlertas: number
  alertasCriticas: number
  alertasPrecaucion: number
}

interface UseInventarioReturn {
  alertas: AlertaStock[]
  kpis: KPIs
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInventario(): UseInventarioReturn {
  const [alertas, setAlertas] = useState<AlertaStock[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    totalAlertas: 0,
    alertasCriticas: 0,
    alertasPrecaucion: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dataAlertas = await api.obtenerAlertasStock()
      
      setAlertas(dataAlertas)
      
      // Calculate KPIs
      const criticas = dataAlertas.filter(a => a.nivel === 'critico').length
      const precaucion = dataAlertas.filter(a => a.nivel === 'precaucion').length
      
      setKpis({
        totalAlertas: dataAlertas.length,
        alertasCriticas: criticas,
        alertasPrecaucion: precaucion,
      })

    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Error al cargar datos de inventario")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    alertas,
    kpis,
    loading,
    error,
    refetch: fetchData,
  }
}
