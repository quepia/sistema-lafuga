"use client"

import { useState } from "react"
import { useMovimientosStock } from "@/hooks/use-movimientos-stock"
import { TipoMovimiento } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Calendar as CalendarIcon, FilterX } from "lucide-react"

export default function HistorialMovimientosPage() {
  const {
    movimientos,
    total,
    loading,
    error,
    offset,
    filtrarPorProducto,
    filtrarPorTipo,
    filtrarPorFecha,
    cambiarPagina,
    refetch
  } = useMovimientosStock()

  const [filtroId, setFiltroId] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  
  // Handlers
  const handleSearchProducto = () => {
    filtrarPorProducto(filtroId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchProducto()
    }
  }

  const handleFechaChange = (type: 'desde' | 'hasta', val: string) => {
    if (type === 'desde') {
      setFechaDesde(val)
      filtrarPorFecha(val || undefined, fechaHasta || undefined)
    } else {
      setFechaHasta(val)
      filtrarPorFecha(fechaDesde || undefined, val || undefined)
    }
  }

  const limpiarFiltros = () => {
    setFiltroId("")
    setFechaDesde("")
    setFechaHasta("")
    filtrarPorProducto("")
    filtrarPorTipo(undefined)
    filtrarPorFecha(undefined, undefined)
  }

  // Helper for Badge colors
  const getBadgeVariant = (tipo: TipoMovimiento) => {
    switch (tipo) {
      case 'VENTA': return 'destructive' // Red
      case 'COMPRA': return 'default' // Primary/Black (often green in customized themes)
      case 'AJUSTE_MANUAL': return 'secondary' // Blueish/Gray
      case 'MERMA': return 'warning' // Orange-ish (if warning variant exists, else destructive)
      case 'ROTURA': return 'destructive'
      case 'VENCIMIENTO': return 'destructive'
      case 'DEVOLUCION_CLIENTE': return 'secondary'
      case 'DEVOLUCION_PROVEEDOR': return 'outline'
      case 'INVENTARIO_INICIAL': return 'default'
      default: return 'outline'
    }
  }

  // Custom Badge color mapping if variant is restricted to 'default' | 'secondary' | 'destructive' | 'outline'
  const getBadgeColorClass = (tipo: TipoMovimiento) => {
     switch (tipo) {
      case 'COMPRA': return "bg-green-600 hover:bg-green-700 text-white";
      case 'MERMA': return "bg-orange-500 hover:bg-orange-600 text-white";
      case 'AJUSTE_MANUAL': return "bg-blue-500 hover:bg-blue-600 text-white";
      default: return "";
     }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Historial de Movimientos</h1>
        <p className="text-muted-foreground">
          Auditoría completa de entradas, salidas y ajustes de inventario.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refina la búsqueda de movimientos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro Producto ID */}
            <div className="flex gap-2">
              <Input
                placeholder="ID Producto..."
                value={filtroId}
                onChange={(e) => setFiltroId(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button variant="secondary" onClick={handleSearchProducto} title="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtro Tipo Movimiento */}
            <Select onValueChange={(val) => filtrarPorTipo(val === "TODOS" ? undefined : val as TipoMovimiento)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="VENTA">Venta</SelectItem>
                <SelectItem value="COMPRA">Compra</SelectItem>
                <SelectItem value="AJUSTE_MANUAL">Ajuste Manual</SelectItem>
                <SelectItem value="MERMA">Merma</SelectItem>
                <SelectItem value="ROTURA">Rotura</SelectItem>
                <SelectItem value="VENCIMIENTO">Vencimiento</SelectItem>
                <SelectItem value="DEVOLUCION_CLIENTE">Devolución Cliente</SelectItem>
                <SelectItem value="DEVOLUCION_PROVEEDOR">Devolución Proveedor</SelectItem>
                <SelectItem value="INVENTARIO_INICIAL">Inventario Inicial</SelectItem>
                <SelectItem value="CONSUMO_INTERNO">Consumo Interno</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Fechas */}
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => handleFechaChange('desde', e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => handleFechaChange('hasta', e.target.value)}
                className="w-full"
              />
            </div>

            {/* Botón Limpiar */}
            <Button variant="ghost" onClick={limpiarFiltros} className="w-full md:w-auto">
              <FilterX className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Stock Resultante</TableHead>
                <TableHead>Motivo / Referencia</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron movimientos.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {mov.producto_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(mov.tipo_movimiento)} className={getBadgeColorClass(mov.tipo_movimiento)}>
                        {mov.tipo_movimiento.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${mov.cantidad > 0 ? "text-green-600" : "text-red-600"}`}>
                      {mov.cantidad > 0 ? "+" : ""}{mov.cantidad}
                    </TableCell>
                    <TableCell className="text-right">
                      {mov.stock_resultante}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={mov.motivo || mov.referencia_id || ""}>
                      {mov.motivo || (mov.referencia_id ? `Ref: ${mov.referencia_id.slice(0, 8)}...` : "-")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {mov.usuario_id ? "Usuario Sistema" : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => cambiarPagina(Math.max(0, offset - 50))}
          disabled={offset === 0 || loading}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cambiarPagina(offset + 50)}
          disabled={offset + 50 >= total || loading}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}