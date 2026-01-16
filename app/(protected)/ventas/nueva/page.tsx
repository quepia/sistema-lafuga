"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, CreditCard, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import TicketPrint from "@/components/ticket-print"
import { api, Producto } from "@/lib/api"

interface CarritoItem {
  producto: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
}

interface VentaCreada {
  id: string
  fecha: string
  cliente_nombre: string
  total: number
  tipo_venta: string
  metodo_pago: string
  detalles: Array<{
    nombre_producto: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }>
}

export default function NuevaVentaPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [clienteNombre, setClienteNombre] = useState("")
  const [tipoVenta, setTipoVenta] = useState<"MENOR" | "MAYOR">("MENOR")
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "Transferencia" | "Tarjeta">("Efectivo")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [ventaCreada, setVentaCreada] = useState<VentaCreada | null>(null)
  const [showPrint, setShowPrint] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Buscar productos usando api.ts directamente
  const buscarProductos = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const productos = await api.buscarProductos(query, 10)
      setSearchResults(productos)
    } catch (error) {
      console.error("Error buscando productos:", error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarProductos(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Calcular precio segun tipo de venta
  const getPrecio = (producto: Producto) => {
    return tipoVenta === "MAYOR" ? producto.precio_mayor : producto.precio_menor
  }

  // Agregar al carrito
  const agregarAlCarrito = (producto: Producto) => {
    const existente = carrito.find(item => item.producto.id === producto.id)
    const precio = getPrecio(producto)

    if (existente) {
      setCarrito(carrito.map(item =>
        item.producto.id === producto.id
          ? {
              ...item,
              cantidad: item.cantidad + 1,
              subtotal: (item.cantidad + 1) * precio
            }
          : item
      ))
    } else {
      setCarrito([...carrito, {
        producto,
        cantidad: 1,
        precioUnitario: precio,
        subtotal: precio
      }])
    }

    setSearchQuery("")
    setSearchResults([])
    searchInputRef.current?.focus()

    toast({
      title: "Producto agregado",
      description: producto.nombre,
    })
  }

  // Actualizar cantidad
  const actualizarCantidad = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId)
      return
    }

    setCarrito(carrito.map(item =>
      item.producto.id === productoId
        ? {
            ...item,
            cantidad: nuevaCantidad,
            subtotal: nuevaCantidad * item.precioUnitario
          }
        : item
    ))
  }

  // Eliminar del carrito
  const eliminarDelCarrito = (productoId: string) => {
    setCarrito(carrito.filter(item => item.producto.id !== productoId))
  }

  // Calcular total
  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0)

  // Actualizar precios cuando cambia el tipo de venta
  useEffect(() => {
    setCarrito(carrito.map(item => {
      const nuevoPrecio = getPrecio(item.producto)
      return {
        ...item,
        precioUnitario: nuevoPrecio,
        subtotal: item.cantidad * nuevoPrecio
      }
    }))
  }, [tipoVenta])

  // Generar ticket y guardar venta
  const generarTicket = async () => {
    if (carrito.length === 0) {
      toast({
        title: "Error",
        description: "El carrito esta vacio",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Preparar datos de la venta
      const detallesVenta = carrito.map(item => ({
        producto_id: item.producto.id,
        nombre_producto: item.producto.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        subtotal: item.subtotal
      }))

      // Guardar venta en Supabase
      const ventaGuardada = await api.crearVenta({
        tipo_venta: tipoVenta,
        total,
        metodo_pago: metodoPago,
        cliente_nombre: clienteNombre || "Cliente General",
        productos: detallesVenta
      })

      // Crear objeto de venta para el ticket
      const venta: VentaCreada = {
        id: ventaGuardada.id,
        fecha: ventaGuardada.created_at,
        cliente_nombre: clienteNombre || "Cliente General",
        total,
        tipo_venta: tipoVenta === "MAYOR" ? "Mayorista" : "Minorista",
        metodo_pago: metodoPago,
        detalles: detallesVenta.map(d => ({
          nombre_producto: d.nombre_producto,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal
        }))
      }

      setVentaCreada(venta)
      setShowPrint(true)

      // Limpiar carrito
      setCarrito([])
      setClienteNombre("")

      toast({
        title: "Venta registrada",
        description: `Ticket #${ventaGuardada.id.slice(0, 8)} generado correctamente`,
      })
    } catch (error) {
      console.error("Error al crear venta:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar el ticket",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Nueva Venta</h1>
          <p className="text-muted-foreground">Genera tickets y presupuestos</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tipoVenta} onValueChange={(v) => setTipoVenta(v as "MENOR" | "MAYOR")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MENOR">Minorista</SelectItem>
              <SelectItem value="MAYOR">Mayorista</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant={tipoVenta === "MAYOR" ? "default" : "secondary"}>
            {tipoVenta === "MAYOR" ? "Mayorista" : "Minorista"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Buscador y resultados */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buscador */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto por nombre o codigo..."
                  className="pl-10 text-lg h-14"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Resultados de busqueda */}
              {searchResults.length > 0 && (
                <div className="mt-4 border rounded-lg divide-y max-h-64 overflow-auto">
                  {searchResults.map((producto) => (
                    <div
                      key={producto.id}
                      className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center"
                      onClick={() => agregarAlCarrito(producto)}
                    >
                      <div>
                        <p className="font-medium">{producto.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {producto.id} - {producto.categoria || "Sin categoría"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          ${getPrecio(producto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </p>
                        <Button size="sm" variant="ghost">
                          <Plus className="h-4 w-4 mr-1" /> Agregar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searching && (
                <p className="text-center text-muted-foreground mt-4">Buscando...</p>
              )}
            </CardContent>
          </Card>

          {/* Carrito */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito ({carrito.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carrito.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>El carrito esta vacio</p>
                  <p className="text-sm">Busca productos para agregarlos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carrito.map((item) => (
                        <TableRow key={item.producto.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.producto.nombre}</p>
                              <p className="text-xs text-muted-foreground">{item.producto.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={item.cantidad}
                                onChange={(e) => actualizarCantidad(item.producto.id, Number(e.target.value))}
                                className="w-16 text-center h-8"
                                min="1"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.precioUnitario.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* Panel lateral - Total y Cliente */}
        <div className="space-y-4">
          <Card className="bg-brand-blue text-white">
            <CardContent className="p-6">
              <p className="text-sm opacity-80">Total a pagar</p>
              <p className="text-4xl font-bold mt-1">
                ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm opacity-80 mt-2">
                {carrito.length} productos - Venta {tipoVenta === "MAYOR" ? "Mayorista" : "Minorista"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Datos de la Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nombre del cliente</label>
                <Input
                  placeholder="Cliente General"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Método de pago</label>
                <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as "Efectivo" | "Transferencia" | "Tarjeta")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> Efectivo
                      </span>
                    </SelectItem>
                    <SelectItem value="Transferencia">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Transferencia
                      </span>
                    </SelectItem>
                    <SelectItem value="Tarjeta">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Tarjeta
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full h-14 text-lg"
                size="lg"
                onClick={generarTicket}
                disabled={loading || carrito.length === 0}
              >
                <Printer className="h-5 w-5 mr-2" />
                {loading ? "Generando..." : "Cobrar y Generar Ticket"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de impresion */}
      {showPrint && ventaCreada && (
        <TicketPrint
          venta={ventaCreada}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  )
}
