"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCompras } from "@/hooks/use-compras"
import { Compra, EstadoCompra } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Eye, FileText, Package } from "lucide-react"
import { useCompra } from "@/hooks/use-compras"

const ESTADOS: { value: EstadoCompra | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const getEstadoBadgeVariant = (estado: EstadoCompra): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado) {
    case 'PENDIENTE':
      return 'secondary' // yellow-ish in default theme
    case 'RECIBIDA':
      return 'default' // green-ish
    case 'PARCIAL':
      return 'outline' // blue-ish
    case 'CANCELADA':
      return 'destructive' // red
    default:
      return 'secondary'
  }
}

const getEstadoLabel = (estado: EstadoCompra): string => {
  const found = ESTADOS.find(e => e.value === estado)
  return found?.label || estado
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-AR')
}

const getTipoDocumentoLabel = (tipo: string): string => {
  const labels: Record<string, string> = {
    'FACTURA_A': 'Factura A',
    'FACTURA_B': 'Factura B',
    'FACTURA_C': 'Factura C',
    'REMITO': 'Remito',
    'NOTA_CREDITO': 'Nota de Crédito',
  }
  return labels[tipo] || tipo
}

function DetalleCompraDialog({ compraId, open, onOpenChange }: { compraId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { compra, isLoading } = useCompra(compraId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalle de Compra
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Cargando...</div>
        ) : !compra ? (
          <div className="py-8 text-center text-gray-500">No se encontró la compra</div>
        ) : (
          <div className="space-y-6">
            {/* Info general */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Fecha</p>
                <p className="font-medium">{formatDate(compra.fecha)}</p>
              </div>
              <div>
                <p className="text-gray-500">Proveedor</p>
                <p className="font-medium">{compra.proveedor_nombre || compra.proveedor_id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-gray-500">Documento</p>
                <p className="font-medium">{getTipoDocumentoLabel(compra.tipo_documento)} {compra.numero_factura}</p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <Badge variant={getEstadoBadgeVariant(compra.estado)}>
                  {getEstadoLabel(compra.estado)}
                </Badge>
              </div>
            </div>

            {/* Totales */}
            <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Subtotal</p>
                <p className="font-medium">{formatCurrency(compra.subtotal)}</p>
              </div>
              <div>
                <p className="text-gray-500">IVA (21%)</p>
                <p className="font-medium">{formatCurrency(compra.iva)}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Total</p>
                <p className="font-bold text-lg">{formatCurrency(compra.total)}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Productos ({compra.detalle?.length || 0})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Costo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compra.detalle?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.producto_nombre || item.producto_id}</p>
                          {item.lote && (
                            <p className="text-xs text-gray-500">Lote: {item.lote}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.cantidad}
                        {item.cantidad_recibida !== item.cantidad && (
                          <p className="text-xs text-gray-500">
                            Recibido: {item.cantidad_recibida}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.costo_unitario)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.costo_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {compra.notas && (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                <p className="text-gray-500 text-xs mb-1">Notas:</p>
                <p>{compra.notas}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function HistorialComprasPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<EstadoCompra | 'TODOS'>('TODOS')
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [proveedorFilter, setProveedorFilter] = useState("")
  const [offset, setOffset] = useState(0)
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [compraSeleccionada, setCompraSeleccionada] = useState<string | null>(null)

  const limit = 50

  const { compras, total, isLoading, isError } = useCompras({
    estado: estado === 'TODOS' ? undefined : estado,
    desde: desde || undefined,
    hasta: hasta || undefined,
    limit,
    offset,
  })

  // Filtrar por proveedor localmente (hasta que tengamos el join)
  const comprasFiltradas = compras.filter(c => {
    if (!proveedorFilter) return true
    return c.proveedor_id.toLowerCase().includes(proveedorFilter.toLowerCase())
  })

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  const verDetalle = (compraId: string) => {
    setCompraSeleccionada(compraId)
    setDetalleAbierto(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historial de Compras</h1>
        <Button onClick={() => router.push('/inventario/compras/nueva')}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Desde</label>
              <Input
                type="date"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value)
                  setOffset(0)
                }}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Hasta</label>
              <Input
                type="date"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value)
                  setOffset(0)
                }}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Estado</label>
              <Select
                value={estado}
                onValueChange={(v) => {
                  setEstado(v as EstadoCompra | 'TODOS')
                  setOffset(0)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Proveedor (ID)</label>
              <Input
                placeholder="Buscar proveedor..."
                value={proveedorFilter}
                onChange={(e) => setProveedorFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-gray-500">
            {isLoading ? 'Cargando...' : `${total} compras encontradas`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="text-center py-8 text-red-500">
              Error al cargar las compras
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>N° Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Cargando compras...
                      </TableCell>
                    </TableRow>
                  ) : comprasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No se encontraron compras
                      </TableCell>
                    </TableRow>
                  ) : (
                    comprasFiltradas.map((compra) => (
                      <TableRow key={compra.id}>
                        <TableCell>{formatDate(compra.fecha)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {compra.proveedor_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>{compra.numero_factura || '-'}</TableCell>
                        <TableCell>{getTipoDocumentoLabel(compra.tipo_documento)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(compra.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEstadoBadgeVariant(compra.estado)}>
                            {getEstadoLabel(compra.estado)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verDetalle(compra.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setOffset(offset + limit)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <DetalleCompraDialog
        compraId={compraSeleccionada}
        open={detalleAbierto}
        onOpenChange={setDetalleAbierto}
      />
    </div>
  )
}
