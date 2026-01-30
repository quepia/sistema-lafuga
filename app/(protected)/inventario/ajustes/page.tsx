"use client"

import { useEffect, useState } from "react"
import { AjusteStockForm } from "@/components/inventario/AjusteStockForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useMovimientosStock } from "@/hooks/use-movimientos-stock"
import { TipoMovimiento } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"

const TIPOS_AJUSTE: TipoMovimiento[] = ['AJUSTE_MANUAL', 'MERMA', 'ROTURA', 'VENCIMIENTO', 'CONSUMO_INTERNO']

export default function AjustesStockPage() {
  const { movimientos, loading, refetch } = useMovimientosStock({
    limit: 100, // Fetch enough to find recent adjustments among sales
    autoFetch: true
  })

  // Filter only adjustments
  const ajustesRecientes = movimientos.filter(m => TIPOS_AJUSTE.includes(m.tipo_movimiento)).slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Ajustes de Stock</h1>
        <p className="text-muted-foreground">
          Realizar correcciones manuales, registrar mermas o roturas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Ajuste</CardTitle>
            <CardDescription>
              Seleccione un producto y el motivo del ajuste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AjusteStockForm onSuccess={refetch} />
          </CardContent>
        </Card>

        {/* Historial Reciente */}
        <Card>
          <CardHeader>
            <CardTitle>Historial Reciente</CardTitle>
            <CardDescription>
              Últimos 10 ajustes registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : ajustesRecientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No hay ajustes recientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  ajustesRecientes.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="text-xs">
                        {format(new Date(mov.created_at), "dd/MM HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm font-medium truncate max-w-[120px]" title={mov.producto_id}>
                        {mov.producto_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                          {mov.tipo_movimiento.replace(/_/g, " ").slice(0, 10)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold text-sm ${mov.cantidad > 0 ? "text-green-600" : "text-red-600"}`}>
                        {mov.cantidad > 0 ? "+" : ""}{mov.cantidad}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
