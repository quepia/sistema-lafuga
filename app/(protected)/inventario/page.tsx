"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Package, AlertTriangle, TrendingDown, Clock, Plus, Wrench, ArrowRight, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, AlertaStock } from "@/lib/api"

export default function InventarioDashboardPage() {
  const [alertas, setAlertas] = useState<AlertaStock[]>([])
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalProductos: 0,
    valorInventario: 0,
    alertasCriticas: 0,
    alertasPrecaucion: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch alertas
        const alertasData = await api.obtenerAlertasStock()
        setAlertas(alertasData)

        // Fetch KPIs básicos
        const stats = await api.obtenerEstadisticas()
        const criticas = alertasData.filter(a => a.nivel === 'critico').length
        const precaucion = alertasData.filter(a => a.nivel === 'precaucion').length

        setKpis({
          totalProductos: stats.total_productos,
          valorInventario: stats.valuacion?.total_costo_inventario ?? 0,
          alertasCriticas: criticas,
          alertasPrecaucion: precaucion,
        })
      } catch (err) {
        console.error("Error cargando dashboard de inventario:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Resumen del estado del inventario</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : kpis.totalProductos.toLocaleString('es-AR')}
            </div>
            <p className="text-xs text-muted-foreground">productos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `$${kpis.valorInventario.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
            </div>
            <p className="text-xs text-muted-foreground">valorizado a costo</p>
          </CardContent>
        </Card>

        <Card className={kpis.alertasCriticas > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${kpis.alertasCriticas > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.alertasCriticas > 0 ? "text-red-600" : ""}`}>
              {loading ? "..." : kpis.alertasCriticas}
            </div>
            <p className="text-xs text-muted-foreground">productos con stock crítico</p>
          </CardContent>
        </Card>

        <Card className={kpis.alertasPrecaucion > 0 ? "border-orange-200 bg-orange-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precaución</CardTitle>
            <Clock className={`h-4 w-4 ${kpis.alertasPrecaucion > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.alertasPrecaucion > 0 ? "text-orange-600" : ""}`}>
              {loading ? "..." : kpis.alertasPrecaucion}
            </div>
            <p className="text-xs text-muted-foreground">productos con stock bajo</p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/inventario/compras/nueva">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-100 p-3">
                <Plus className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="font-medium">Registrar Compra</p>
                <p className="text-sm text-muted-foreground">Ingreso de mercadería</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventario/ajustes">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-100 p-3">
                <Wrench className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="font-medium">Ajuste de Stock</p>
                <p className="text-sm text-muted-foreground">Correcciones manuales</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventario/proveedores">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-purple-100 p-3">
                <Truck className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="font-medium">Proveedores</p>
                <p className="text-sm text-muted-foreground">Gestión de proveedores</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alertas de stock */}
      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas de Stock ({alertas.length})
            </CardTitle>
            <CardDescription>Productos que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead className="text-right">Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.slice(0, 20).map((alerta) => (
                  <TableRow key={alerta.producto_id}>
                    <TableCell className="font-medium">{alerta.nombre}</TableCell>
                    <TableCell className="text-right font-mono">
                      {alerta.stock_actual}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {alerta.stock_minimo}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alerta.nivel === 'critico' ? 'destructive' : 'secondary'}>
                        {alerta.nivel === 'critico' ? 'Crítico' : 'Precaución'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {alertas.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Mostrando 20 de {alertas.length} alertas
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
