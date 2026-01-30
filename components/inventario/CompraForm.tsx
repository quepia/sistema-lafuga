"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api, Producto, CompraDetalleInsert, TipoDocumentoCompra } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Trash2, AlertTriangle, Package, Search } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface ItemCompra {
  id: string
  producto_id: string
  producto_nombre: string
  cantidad: number
  costo_unitario: number
  fecha_vencimiento?: string
  lote?: string
  costo_actual?: number
}

const TIPOS_DOCUMENTO: { value: TipoDocumentoCompra; label: string }[] = [
  { value: 'FACTURA_A', label: 'Factura A' },
  { value: 'FACTURA_B', label: 'Factura B' },
  { value: 'FACTURA_C', label: 'Factura C' },
  { value: 'REMITO', label: 'Remito' },
  { value: 'NOTA_CREDITO', label: 'Nota de Crédito' },
]

export function CompraForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cabecera
  const [proveedorId, setProveedorId] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCompra>('FACTURA_A')
  const [numeroDocumento, setNumeroDocumento] = useState("")
  const [notas, setNotas] = useState("")

  // Items
  const [items, setItems] = useState<ItemCompra[]>([])

  // Búsqueda de productos
  const [busqueda, setBusqueda] = useState("")
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([])
  const [buscando, setBuscando] = useState(false)

  const busquedaDebounced = useDebounce(busqueda, 300)

  // Buscar productos
  const buscarProductos = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProductosEncontrados([])
      return
    }
    setBuscando(true)
    try {
      const productos = await api.buscarProductos(query, 10)
      // Filtrar productos ya agregados
      const productosFiltrados = productos.filter(
        p => !items.some(i => i.producto_id === p.id)
      )
      setProductosEncontrados(productosFiltrados)
    } catch (error) {
      console.error('Error buscando productos:', error)
    } finally {
      setBuscando(false)
    }
  }, [items])

  // Efecto de búsqueda
  useState(() => {
    buscarProductos(busquedaDebounced)
  })

  // Agregar producto a la lista
  const agregarProducto = (producto: Producto) => {
    const newItem: ItemCompra = {
      id: crypto.randomUUID(),
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      cantidad: 1,
      costo_unitario: producto.costo || 0,
      costo_actual: producto.costo || 0,
    }
    setItems([...items, newItem])
    setBusqueda("")
    setProductosEncontrados([])
  }

  // Actualizar item
  const actualizarItem = (id: string, campo: keyof ItemCompra, valor: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [campo]: valor }
      return updated
    }))
  }

  // Eliminar item
  const eliminarItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  // Calcular totales
  const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.costo_unitario), 0)
  const iva = subtotal * 0.21
  const total = subtotal + iva

  // Verificar diferencia de costo
  const getDiferenciaCosto = (item: ItemCompra): { diff: number; showWarning: boolean } => {
    if (!item.costo_actual || item.costo_actual === 0) return { diff: 0, showWarning: false }
    const diff = Math.abs((item.costo_unitario - item.costo_actual) / item.costo_actual) * 100
    return { diff, showWarning: diff > 15 }
  }

  // Submit
  const handleSubmit = async () => {
    if (!proveedorId.trim()) {
      toast.error('Debe ingresar un proveedor')
      return
    }
    if (items.length === 0) {
      toast.error('Debe agregar al menos un producto')
      return
    }
    if (items.some(i => i.cantidad <= 0 || i.costo_unitario <= 0)) {
      toast.error('Todos los items deben tener cantidad y costo mayor a 0')
      return
    }

    setIsSubmitting(true)
    try {
      const itemsInsert: CompraDetalleInsert[] = items.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario,
        fecha_vencimiento: item.fecha_vencimiento,
        lote: item.lote,
      }))

      await api.registrarCompra({
        proveedor_id: proveedorId,
        fecha,
        numero_factura: numeroDocumento || undefined,
        tipo_documento: tipoDocumento,
        notas: notas || undefined,
        items: itemsInsert,
      })

      toast.success('Compra registrada correctamente')
      router.push('/inventario/compras')
    } catch (error) {
      console.error('Error registrando compra:', error)
      toast.error('Error al registrar la compra')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Datos de la Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="proveedor">Proveedor ID</Label>
              <Input
                id="proveedor"
                placeholder="ID del proveedor"
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo de Documento</Label>
              <Select value={tipoDocumento} onValueChange={(v) => setTipoDocumento(v as TipoDocumentoCompra)}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="numero">N° Documento</Label>
              <Input
                id="numero"
                placeholder="0001-00000001"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                placeholder="Observaciones adicionales..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Búsqueda de productos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar producto por nombre o código..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                if (e.target.value.trim()) {
                  buscarProductos(e.target.value)
                } else {
                  setProductosEncontrados([])
                }
              }}
              className="pl-10"
            />
            {buscando && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                Buscando...
              </span>
            )}
          </div>

          {/* Resultados de búsqueda */}
          {productosEncontrados.length > 0 && (
            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
              {productosEncontrados.map((producto) => (
                <button
                  key={producto.id}
                  onClick={() => agregarProducto(producto)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{producto.nombre}</p>
                    <p className="text-xs text-gray-500">Código: {producto.id}</p>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {busqueda.trim() && !buscando && productosEncontrados.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">No se encontraron productos</p>
          )}
        </CardContent>
      </Card>

      {/* Tabla de items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de Productos ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay productos agregados</p>
              <p className="text-sm">Use el buscador para agregar productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-24">Cantidad</TableHead>
                    <TableHead className="w-32">Costo Unit.</TableHead>
                    <TableHead className="w-32">Costo Total</TableHead>
                    <TableHead className="w-36">Vencimiento</TableHead>
                    <TableHead className="w-24">Lote</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const { diff, showWarning } = getDiferenciaCosto(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.producto_nombre}</p>
                            <p className="text-xs text-gray-500">{item.producto_id}</p>
                            {showWarning && (
                              <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
                                <AlertTriangle className="w-3 h-3" />
                                Costo difiere {diff.toFixed(0)}% del actual
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad}
                            onChange={(e) => actualizarItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={`Actual: ${item.costo_actual?.toFixed(2) || '0.00'}`}
                            value={item.costo_unitario || ''}
                            onChange={(e) => actualizarItem(item.id, 'costo_unitario', parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${(item.cantidad * item.costo_unitario).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={item.fecha_vencimiento || ''}
                            onChange={(e) => actualizarItem(item.id, 'fecha_vencimiento', e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Lote"
                            value={item.lote || ''}
                            onChange={(e) => actualizarItem(item.id, 'lote', e.target.value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => eliminarItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen y acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex justify-between md:justify-start md:gap-8 text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between md:justify-start md:gap-8 text-sm">
                <span className="text-gray-500">IVA (21%):</span>
                <span className="font-medium">${iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between md:justify-start md:gap-8 text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/inventario/compras')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || items.length === 0}
                className="min-w-[160px]"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar Recepción'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
