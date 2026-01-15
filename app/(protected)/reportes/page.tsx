"use client"

import { useState, useEffect } from "react"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  RefreshCw,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, ReportesData, ApiError } from "@/lib/api"

export default function ReportesPage() {
  const [reportes, setReportes] = useState<ReportesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReportes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.obtenerReportes()
      setReportes(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Error al cargar los reportes")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportes()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchReportes} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Analisis de rentabilidad e inventario
          </p>
        </div>
        <Button
          onClick={fetchReportes}
          variant="outline"
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Valuation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Inventory Cost */}
        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Total Inventario
            </CardTitle>
            <Package className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <div className="text-2xl font-bold text-brand-dark">
                {formatCurrency(reportes?.valuacion.total_costo_inventario || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Inversion en stock
            </p>
          </CardContent>
        </Card>

        {/* Total Retail Value (Minorista) */}
        <Card className="border-l-4 border-l-[#006AC0]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Minorista
            </CardTitle>
            <DollarSign className="h-5 w-5 text-[#006AC0]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <div className="text-2xl font-bold text-[#006AC0]">
                {formatCurrency(reportes?.valuacion.total_valor_minorista || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Potencial de venta menor
            </p>
          </CardContent>
        </Card>

        {/* Total Wholesale Value (Mayorista) */}
        <Card className="border-l-4 border-l-[#FF1F8F]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Mayorista
            </CardTitle>
            <DollarSign className="h-5 w-5 text-[#FF1F8F]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <div className="text-2xl font-bold text-[#FF1F8F]">
                {formatCurrency(reportes?.valuacion.total_valor_mayorista || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Potencial de venta mayor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Potential Profit Minorista */}
        <Card className="bg-gradient-to-r from-[#006AC0]/10 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#006AC0]" />
              Ganancia Potencial Minorista
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-40" />
            ) : (
              <>
                <div className="text-3xl font-bold text-[#006AC0]">
                  {formatCurrency(
                    reportes?.valuacion.ganancia_potencial_minorista || 0
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Margen promedio:
                  </span>
                  <Badge
                    variant={
                      (reportes?.rentabilidad.margen_promedio_minorista || 0) > 0
                        ? "default"
                        : "destructive"
                    }
                    className="bg-[#006AC0]"
                  >
                    {formatPercent(
                      reportes?.rentabilidad.margen_promedio_minorista || 0
                    )}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Potential Profit Mayorista */}
        <Card className="bg-gradient-to-r from-[#FF1F8F]/10 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#FF1F8F]" />
              Ganancia Potencial Mayorista
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-40" />
            ) : (
              <>
                <div className="text-3xl font-bold text-[#FF1F8F]">
                  {formatCurrency(
                    reportes?.valuacion.ganancia_potencial_mayorista || 0
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Margen promedio:
                  </span>
                  <Badge
                    variant={
                      (reportes?.rentabilidad.margen_promedio_mayorista || 0) > 0
                        ? "default"
                        : "destructive"
                    }
                    className="bg-[#FF1F8F]"
                  >
                    {formatPercent(
                      reportes?.rentabilidad.margen_promedio_mayorista || 0
                    )}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Negative Margin Alert */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Alertas: Margen Negativo
              {!loading && reportes && (
                <Badge variant="destructive">
                  {reportes.alertas.total_margen_negativo}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reportes?.alertas.productos_margen_negativo.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay productos con margen negativo
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {reportes?.alertas.productos_margen_negativo.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.producto}</p>
                      <p className="text-xs text-muted-foreground">
                        Codigo: {p.codigo}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs text-red-600">
                        Costo: {formatCurrency(p.costo_compra)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Precio: {formatCurrency(p.precio_menor)}
                      </p>
                    </div>
                  </div>
                ))}
                {(reportes?.alertas.total_margen_negativo || 0) > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Y {reportes!.alertas.total_margen_negativo - 10} productos mas...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zero Price Alert */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas: Sin Precio
              {!loading && reportes && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  {reportes.alertas.total_sin_precio}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reportes?.alertas.productos_sin_precio.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Todos los productos tienen precio
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {reportes?.alertas.productos_sin_precio.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.producto}</p>
                      <p className="text-xs text-muted-foreground">
                        Codigo: {p.codigo}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {p.categoria}
                    </Badge>
                  </div>
                ))}
                {(reportes?.alertas.total_sin_precio || 0) > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Y {reportes!.alertas.total_sin_precio - 10} productos mas...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Costo Total</TableHead>
                    <TableHead className="text-right">Valor Minorista</TableHead>
                    <TableHead className="text-right">Margen Min.</TableHead>
                    <TableHead className="text-right">Valor Mayorista</TableHead>
                    <TableHead className="text-right">Margen May.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportes?.categoria_performance.map((cat) => (
                    <TableRow key={cat.categoria}>
                      <TableCell className="font-medium">{cat.categoria}</TableCell>
                      <TableCell className="text-right">{cat.total_items}</TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatCurrency(cat.total_costo)}
                      </TableCell>
                      <TableCell className="text-right text-[#006AC0]">
                        {formatCurrency(cat.total_valor_menor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={cat.margen_promedio_menor >= 0 ? "default" : "destructive"}
                          className={cat.margen_promedio_menor >= 0 ? "bg-green-500" : ""}
                        >
                          {formatPercent(cat.margen_promedio_menor)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[#FF1F8F]">
                        {formatCurrency(cat.total_valor_mayor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={cat.margen_promedio_mayor >= 0 ? "default" : "destructive"}
                          className={cat.margen_promedio_mayor >= 0 ? "bg-green-500" : ""}
                        >
                          {formatPercent(cat.margen_promedio_mayor)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
