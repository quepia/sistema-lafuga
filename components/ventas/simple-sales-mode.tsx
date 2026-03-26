"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  Banknote,
  Barcode,
  CreditCard,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { api, Producto, VentaProductoExtendido } from "@/lib/api"
import { PrintFormat, PrintOptionsDialog } from "@/components/PrintOptionsDialog"

const TicketPrint = dynamic(() => import("@/components/ticket-print"), { ssr: false })
const ThermalTicket = dynamic(() => import("@/components/ThermalTicket"), { ssr: false })

interface CarritoItem {
  producto: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
}

interface VentaCreada {
  id: string
  fecha: string
  created_at: string
  cliente_nombre: string
  total: number
  tipo_venta: "MENOR"
  metodo_pago: string
  productos: Array<{
    producto_id: string
    nombre_producto: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }>
}

interface VentaSimpleDraft {
  version: number
  carrito: CarritoItem[]
  clienteNombre: string
  metodoPago: "Efectivo" | "Transferencia" | "Tarjeta"
}

const DRAFT_VERSION = 1

function getDraftStorageKey(userId?: string) {
  return `venta-simple-draft:${userId ?? "default"}`
}

function isVentaSimpleDraft(value: unknown): value is VentaSimpleDraft {
  if (!value || typeof value !== "object") return false

  const draft = value as Partial<VentaSimpleDraft>

  return (
    draft.version === DRAFT_VERSION &&
    Array.isArray(draft.carrito) &&
    typeof draft.clienteNombre === "string" &&
    (draft.metodoPago === "Efectivo" ||
      draft.metodoPago === "Transferencia" ||
      draft.metodoPago === "Tarjeta")
  )
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatQuantity(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("es-AR")
    : value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

function getQuantityStep(producto: Producto) {
  return producto.permite_venta_fraccionada ? 0.5 : 1
}

function normalizeQuantity(producto: Producto, value: number) {
  if (producto.permite_venta_fraccionada) {
    return Math.max(0.001, Math.round(value * 1000) / 1000)
  }

  return Math.max(1, Math.round(value))
}

function findExactMatch(productos: Producto[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  return (
    productos.find((producto) => producto.codigo_barra?.trim().toLowerCase() === normalizedQuery) ||
    productos.find((producto) => producto.id.trim().toLowerCase() === normalizedQuery) ||
    productos.find((producto) => producto.nombre.trim().toLowerCase() === normalizedQuery)
  )
}

export default function SimpleSalesMode() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Producto[]>([])
  const [featuredProduct, setFeaturedProduct] = useState<Producto | null>(null)
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [clienteNombre, setClienteNombre] = useState("")
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "Transferencia" | "Tarjeta">("Efectivo")
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [ventaCreada, setVentaCreada] = useState<VentaCreada | null>(null)
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [printFormat, setPrintFormat] = useState<PrintFormat>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const latestSearchIdRef = useRef(0)

  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()

  const draftStorageKey = getDraftStorageKey(user?.id)

  const focusSearch = () => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }

  const limpiarVentaEnCurso = () => {
    latestSearchIdRef.current += 1
    setSearchQuery("")
    setSearchResults([])
    setFeaturedProduct(null)
    setCarrito([])
    setClienteNombre("")
    setMetodoPago("Efectivo")

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey)
    }

    requestAnimationFrame(() => focusSearch())
  }

  const agregarAlCarrito = (producto: Producto) => {
    latestSearchIdRef.current += 1

    setCarrito((current) => {
      const existente = current.find((item) => item.producto.id === producto.id)

      if (existente) {
        return current.map((item) =>
          item.producto.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precioUnitario,
              }
            : item
        )
      }

      return [
        ...current,
        {
          producto,
          cantidad: 1,
          precioUnitario: producto.precio_menor,
          subtotal: producto.precio_menor,
        },
      ]
    })

    setFeaturedProduct(producto)
    setSearchQuery("")
    setSearchResults([])

    toast({
      title: "Producto agregado",
      description: producto.nombre,
    })

    requestAnimationFrame(() => focusSearch())
  }

  const actualizarCantidad = (productoId: string, nuevaCantidad: number) => {
    setCarrito((current) =>
      current
        .map((item) => {
          if (item.producto.id !== productoId) return item

          const cantidadNormalizada = normalizeQuantity(item.producto, nuevaCantidad)

          return {
            ...item,
            cantidad: cantidadNormalizada,
            subtotal: cantidadNormalizada * item.precioUnitario,
          }
        })
        .filter((item) => item.cantidad > 0)
    )
  }

  const ajustarCantidad = (productoId: string, delta: number) => {
    const item = carrito.find((current) => current.producto.id === productoId)
    if (!item) return

    const nuevaCantidad = item.cantidad + delta

    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId)
      return
    }

    actualizarCantidad(productoId, nuevaCantidad)
  }

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito((current) => current.filter((item) => item.producto.id !== productoId))
    requestAnimationFrame(() => focusSearch())
  }

  const buscarProductos = async (query: string, autoAgregarSiEsExacto = false) => {
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
      setSearchResults([])
      return
    }

    const searchId = latestSearchIdRef.current + 1
    latestSearchIdRef.current = searchId
    setSearching(true)

    try {
      const productos = await api.buscarProductos(normalizedQuery, 8)

      if (latestSearchIdRef.current !== searchId) return

      setSearchResults(productos)

      const exacto = findExactMatch(productos, normalizedQuery)
      const productoResuelto = exacto || (productos.length === 1 ? productos[0] : null)

      if (productoResuelto) {
        setFeaturedProduct(productoResuelto)
      }

      const esBusquedaTipoEscaner = !normalizedQuery.includes(" ")

      if (autoAgregarSiEsExacto && esBusquedaTipoEscaner && productoResuelto) {
        agregarAlCarrito(productoResuelto)
      } else if (autoAgregarSiEsExacto && productos.length === 0) {
        toast({
          title: "Producto no encontrado",
          description: `No hay resultados para "${normalizedQuery}".`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error buscando productos en modo simple:", error)

      if (latestSearchIdRef.current === searchId) {
        setSearchResults([])
      }

      toast({
        title: "Error",
        description: "No se pudo buscar el producto.",
        variant: "destructive",
      })
    } finally {
      if (latestSearchIdRef.current === searchId) {
        setSearching(false)
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      const normalizedQuery = searchQuery.trim()
      const searchId = latestSearchIdRef.current + 1
      latestSearchIdRef.current = searchId
      setSearching(true)

      void api
        .buscarProductos(normalizedQuery, 8)
        .then((productos) => {
          if (latestSearchIdRef.current !== searchId) return

          setSearchResults(productos)

          const exacto = findExactMatch(productos, normalizedQuery)
          const productoResuelto = exacto || (productos.length === 1 ? productos[0] : null)

          if (productoResuelto) {
            setFeaturedProduct(productoResuelto)
          }
        })
        .catch((error) => {
          console.error("Error buscando productos en modo simple:", error)

          if (latestSearchIdRef.current === searchId) {
            setSearchResults([])
          }

          toast({
            title: "Error",
            description: "No se pudo buscar el producto.",
            variant: "destructive",
          })
        })
        .finally(() => {
          if (latestSearchIdRef.current === searchId) {
            setSearching(false)
          }
        })
    }, 180)

    return () => window.clearTimeout(timer)
  }, [searchQuery, toast])

  useEffect(() => {
    requestAnimationFrame(() => focusSearch())
  }, [])

  useEffect(() => {
    if (authLoading || typeof window === "undefined") return

    try {
      const storedDraft = window.localStorage.getItem(draftStorageKey)

      if (!storedDraft) {
        return
      }

      const parsedDraft: unknown = JSON.parse(storedDraft)

      if (!isVentaSimpleDraft(parsedDraft)) {
        window.localStorage.removeItem(draftStorageKey)
        return
      }

      setCarrito(parsedDraft.carrito)
      setClienteNombre(parsedDraft.clienteNombre)
      setMetodoPago(parsedDraft.metodoPago)

      const tieneDatos =
        parsedDraft.carrito.length > 0 ||
        parsedDraft.clienteNombre.trim().length > 0 ||
        parsedDraft.metodoPago !== "Efectivo"

      if (tieneDatos) {
        toast({
          title: "Venta recuperada",
          description: "Se restauró la venta simple que estaba en curso.",
        })
      }
    } catch (error) {
      console.error("Error restaurando borrador de venta simple:", error)
      window.localStorage.removeItem(draftStorageKey)
    } finally {
      setDraftReady(true)
    }
  }, [authLoading, draftStorageKey, toast])

  useEffect(() => {
    if (authLoading || !draftReady || typeof window === "undefined") return

    const tieneDatos =
      carrito.length > 0 ||
      clienteNombre.trim().length > 0 ||
      metodoPago !== "Efectivo"

    if (!tieneDatos) {
      window.localStorage.removeItem(draftStorageKey)
      return
    }

    const draft: VentaSimpleDraft = {
      version: DRAFT_VERSION,
      carrito,
      clienteNombre,
      metodoPago,
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [authLoading, carrito, clienteNombre, draftReady, draftStorageKey, metodoPago])

  const subtotal = useMemo(
    () => carrito.reduce((acc, item) => acc + item.subtotal, 0),
    [carrito]
  )

  const totalItems = useMemo(
    () => carrito.reduce((acc, item) => acc + item.cantidad, 0),
    [carrito]
  )

  const featuredInCart = featuredProduct
    ? carrito.find((item) => item.producto.id === featuredProduct.id)
    : null
  const tieneVentaEnCurso =
    carrito.length > 0 ||
    clienteNombre.trim().length > 0 ||
    metodoPago !== "Efectivo"

  const generarTicket = async () => {
    if (carrito.length === 0) {
      toast({
        title: "No hay productos",
        description: "Escaneá o agregá un producto antes de cobrar.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const detallesVenta: VentaProductoExtendido[] = carrito.map((item) => ({
        producto_id: item.producto.id,
        nombre_producto: item.producto.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        subtotal: item.subtotal,
        precio_lista_menor: item.producto.precio_menor,
        precio_lista_mayor: item.producto.precio_mayor,
        costo_unitario: item.producto.costo,
        tipo_precio: "menor",
      }))

      const ventaGuardada = await api.crearVentaExtendida({
        tipo_venta: "MENOR",
        subtotal,
        total: subtotal,
        metodo_pago: metodoPago,
        cliente_nombre: clienteNombre.trim() || "Cliente General",
        productos: detallesVenta,
      })

      setVentaCreada({
        id: ventaGuardada.id,
        fecha: ventaGuardada.created_at,
        created_at: ventaGuardada.created_at,
        cliente_nombre: clienteNombre.trim() || "Cliente General",
        total: subtotal,
        tipo_venta: "MENOR",
        metodo_pago: metodoPago,
        productos: detallesVenta.map((detalle) => ({
          producto_id: detalle.producto_id,
          nombre_producto: detalle.nombre_producto,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          subtotal: detalle.subtotal,
        })),
      })
      setShowPrintOptions(true)

      limpiarVentaEnCurso()

      toast({
        title: "Venta registrada",
        description: `Ticket #${ventaGuardada.id.slice(0, 8)} generado correctamente.`,
      })
    } catch (error) {
      console.error("Error creando venta simple:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar la venta.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const descartarVentaEnCurso = () => {
    const tieneDatos =
      carrito.length > 0 ||
      clienteNombre.trim().length > 0 ||
      metodoPago !== "Efectivo"

    if (!tieneDatos) return

    const confirmar = window.confirm("Se va a eliminar la venta simple en curso. ¿Querés continuar?")
    if (!confirmar) return

    limpiarVentaEnCurso()

    toast({
      title: "Venta descartada",
      description: "Se eliminó la venta simple en curso.",
    })
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3ff_0%,#f7fbff_46%,#f3f4f6_100%)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#006AC0_0%,#0c86de_62%,#6CBEFA_100%)] py-0 text-white shadow-lg">
          <CardContent className="grid gap-4 px-6 py-6 sm:px-8 sm:py-7 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                  <Barcode className="h-3.5 w-3.5" />
                  Venta minorista
                </Badge>
                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                  Borrador automatico
                </Badge>
              </div>
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Cobro rapido para mostrador</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                  Esta pantalla deja solo lo necesario: escanear un producto, ver su precio, agregarlo
                  al carrito y cobrar sin entrar al resto del sistema.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl bg-white/12 p-4 backdrop-blur sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <p className="text-sm text-white/75">Usuario</p>
                <p className="mt-1 flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4" />
                  {user?.name || "Usuario"}
                </p>
              </div>
              <div>
                <p className="text-sm text-white/75">Modo activo</p>
                <p className="mt-1 font-semibold">Precio minorista fijo</p>
              </div>
              <div>
                <p className="text-sm text-white/75">Objetivo</p>
                <p className="mt-1 font-semibold">Escanear, consultar y cobrar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Search className="h-5 w-5 text-[#006AC0]" />
                  Escanear o buscar producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void buscarProductos(searchQuery, true)
                  }}
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Escaneá un código o escribí el nombre del producto..."
                      className="h-16 rounded-2xl border-2 border-[#d9e9f8] bg-[#fbfdff] pl-12 pr-28 text-base shadow-sm"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      autoFocus
                    />
                    {searchQuery.trim() && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => {
                          latestSearchIdRef.current += 1
                          setSearchQuery("")
                          setSearchResults([])
                          focusSearch()
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      className="h-12 rounded-xl bg-[#006AC0] px-5 hover:bg-[#005299]"
                    >
                      <Barcode className="h-4 w-4" />
                      Buscar o agregar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-xl"
                      onClick={() => focusSearch()}
                    >
                      Volver a escanear
                    </Button>
                  </div>
                </form>

                <div className="rounded-2xl border border-dashed border-[#cfe0f2] bg-[#f8fbff] px-4 py-3 text-sm text-muted-foreground">
                  Si el escáner envía Enter al final, el producto se agrega directamente cuando el código
                  coincide con un único resultado.
                </div>

                {searching && (
                  <p className="text-sm text-muted-foreground">Buscando productos...</p>
                )}

                {!searching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                  <div className="rounded-2xl border border-[#ffd7d7] bg-[#fff7f7] px-4 py-4 text-sm text-[#a33b3b]">
                    No se encontraron productos para esa búsqueda.
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 rounded-2xl border bg-white p-2">
                    {searchResults.map((producto) => {
                      const stockActual = producto.stock_actual
                      const sinStock = stockActual !== undefined && stockActual <= 0

                      return (
                        <button
                          key={producto.id}
                          type="button"
                          className="flex w-full flex-col gap-2 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-[#b6d7f4] hover:bg-[#f5fbff] sm:flex-row sm:items-center sm:justify-between"
                          onClick={() => setFeaturedProduct(producto)}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-brand-dark">{producto.nombre}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {producto.codigo_barra || producto.id} • {producto.categoria || "Sin categoría"}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            {stockActual !== undefined && (
                              <Badge variant={sinStock ? "destructive" : "secondary"}>
                                {sinStock ? "Sin stock" : `Stock: ${stockActual}`}
                              </Badge>
                            )}
                            <div className="text-right">
                              <p className="text-lg font-bold text-brand-dark">
                                ${formatCurrency(producto.precio_menor)}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto px-0 text-[#006AC0] hover:bg-transparent hover:text-[#005299]"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  agregarAlCarrito(producto)
                                }}
                              >
                                Agregar
                              </Button>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="h-5 w-5 text-[#006AC0]" />
                  Producto en pantalla
                </CardTitle>
              </CardHeader>
              <CardContent>
                {featuredProduct ? (
                  <div className="rounded-3xl border bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Consulta rápida</Badge>
                          {featuredInCart && (
                            <Badge className="bg-[#006AC0] text-white hover:bg-[#006AC0]">
                              En carrito: {formatQuantity(featuredInCart.cantidad)}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-brand-dark">
                            {featuredProduct.nombre}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {featuredProduct.codigo_barra || featuredProduct.id} •{" "}
                            {featuredProduct.categoria || "Sin categoría"}
                          </p>
                        </div>
                        {featuredProduct.stock_actual !== undefined && (
                          <Badge
                            variant={featuredProduct.stock_actual <= 0 ? "destructive" : "outline"}
                            className="w-fit"
                          >
                            {featuredProduct.stock_actual <= 0
                              ? "Sin stock disponible"
                              : `Stock actual: ${featuredProduct.stock_actual}`}
                          </Badge>
                        )}
                      </div>

                      <div className="rounded-2xl bg-[#0b6dc0] px-5 py-4 text-white shadow-md">
                        <p className="text-sm text-white/75">Precio de venta</p>
                        <p className="mt-1 text-4xl font-bold">
                          ${formatCurrency(featuredProduct.precio_menor)}
                        </p>
                        <p className="mt-1 text-sm text-white/75">Modo simple trabaja solo con lista minorista</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        className="h-12 rounded-xl bg-[#006AC0] px-5 hover:bg-[#005299]"
                        onClick={() => agregarAlCarrito(featuredProduct)}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar a la venta
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12 rounded-xl"
                        onClick={() => focusSearch()}
                      >
                        Buscar otro producto
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed bg-[#fbfdff] px-6 py-10 text-center text-muted-foreground">
                    Escaneá un producto para ver su precio rápidamente antes de agregarlo a la venta.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="h-5 w-5 text-[#006AC0]" />
                  Venta en curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {carrito.length === 0 ? (
                  <div className="rounded-3xl border border-dashed bg-[#fbfdff] px-6 py-10 text-center text-muted-foreground">
                    Todavía no hay productos cargados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {carrito.map((item) => {
                      const step = getQuantityStep(item.producto)

                      return (
                        <div key={item.producto.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-brand-dark">{item.producto.nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                ${formatCurrency(item.precioUnitario)} por unidad
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => eliminarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 rounded-2xl bg-muted p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl"
                                onClick={() => ajustarCantidad(item.producto.id, -step)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>

                              <Input
                                type="number"
                                min={item.producto.permite_venta_fraccionada ? "0.001" : "1"}
                                step={item.producto.permite_venta_fraccionada ? "0.001" : "1"}
                                className="h-10 w-24 rounded-xl border-0 bg-transparent text-center shadow-none"
                                value={item.cantidad}
                                onChange={(event) => {
                                  const parsed = Number.parseFloat(event.target.value)

                                  if (Number.isNaN(parsed)) {
                                    return
                                  }

                                  actualizarCantidad(item.producto.id, parsed)
                                }}
                              />

                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl"
                                onClick={() => ajustarCantidad(item.producto.id, step)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Cantidad: {formatQuantity(item.cantidad)}
                              </p>
                              <p className="text-xl font-bold text-brand-dark">
                                ${formatCurrency(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-[linear-gradient(180deg,#0d6dbf_0%,#05579c_100%)] text-white shadow-lg">
              <CardContent className="space-y-5 px-6 py-6">
                <div>
                  <p className="text-sm text-white/75">Total actual</p>
                  <p className="mt-1 text-4xl font-bold">${formatCurrency(subtotal)}</p>
                  <p className="mt-2 text-sm text-white/75">
                    {formatQuantity(totalItems)} productos cargados en esta venta
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl bg-white/10 p-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/75">Cliente</label>
                    <Input
                      placeholder="Cliente General"
                      className="border-white/20 bg-white text-brand-dark placeholder:text-slate-500"
                      value={clienteNombre}
                      onChange={(event) => setClienteNombre(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/75">Método de pago</label>
                    <Select
                      value={metodoPago}
                      onValueChange={(value) =>
                        setMetodoPago(value as "Efectivo" | "Transferencia" | "Tarjeta")
                      }
                    >
                      <SelectTrigger className="border-white/20 bg-white text-brand-dark">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">
                          <span className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Efectivo
                          </span>
                        </SelectItem>
                        <SelectItem value="Transferencia">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Transferencia
                          </span>
                        </SelectItem>
                        <SelectItem value="Tarjeta">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Tarjeta
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="h-14 w-full rounded-2xl bg-white text-[#005299] hover:bg-white/90"
                    size="lg"
                    onClick={generarTicket}
                    disabled={loading || carrito.length === 0}
                  >
                    <Printer className="h-5 w-5" />
                    {loading ? "Registrando venta..." : "Cobrar y generar ticket"}
                  </Button>

                  <Button
                    variant="secondary"
                    className="h-12 w-full rounded-2xl border-0 bg-white/15 text-white hover:bg-white/20"
                    onClick={descartarVentaEnCurso}
                    disabled={loading || !tieneVentaEnCurso}
                  >
                    <Trash2 className="h-4 w-4" />
                    Vaciar venta actual
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {ventaCreada && (
        <PrintOptionsDialog
          open={showPrintOptions}
          onOpenChange={setShowPrintOptions}
          onSelect={(format) => {
            setPrintFormat(format)
            if (format) {
              setShowPrint(true)
            }
          }}
          total={ventaCreada.total}
          ticketId={ventaCreada.id}
          clienteNombre={ventaCreada.cliente_nombre}
        />
      )}

      {showPrint && ventaCreada && printFormat === "a4" && (
        <TicketPrint
          venta={ventaCreada}
          onClose={() => {
            setShowPrint(false)
            setPrintFormat(null)
          }}
        />
      )}

      {showPrint && ventaCreada && printFormat === "thermal" && (
        <ThermalTicket
          venta={ventaCreada}
          onClose={() => {
            setShowPrint(false)
            setPrintFormat(null)
          }}
        />
      )}
    </div>
  )
}
