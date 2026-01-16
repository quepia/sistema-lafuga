"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Package, Edit2, X, Check, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { api, Producto, ApiError } from "@/lib/api"
import { useCategorias } from "@/hooks/use-categorias"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 20

export default function PriceConsultationView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  // Estado para el modal de edición
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [editPrecioMenor, setEditPrecioMenor] = useState("")
  const [editPrecioMayor, setEditPrecioMayor] = useState("")
  const [editCostoCompra, setEditCostoCompra] = useState("")
  const [updating, setUpdating] = useState(false)

  const { categorias, loading: loadingCategorias } = useCategorias()
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Función para buscar productos
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await api.listarProductos({
        query: searchQuery || undefined,
        categoria: selectedCategory !== "all" ? selectedCategory : undefined,
        limit: ITEMS_PER_PAGE,
        offset,
      })

      setProductos(result.productos)
      setTotal(result.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Error al cargar productos")
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, offset])

  // Debounce para búsqueda
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchProductos()
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [fetchProductos])

  // Reset offset cuando cambia la búsqueda o categoría
  useEffect(() => {
    setOffset(0)
  }, [searchQuery, selectedCategory])

  // Función para abrir modal de edición
  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto)
    setEditPrecioMenor(producto.precio_menor.toString())
    setEditPrecioMayor(producto.precio_mayor.toString())
    setEditCostoCompra(producto.costo.toString())
  }

  // Función para guardar cambios
  const handleSave = async () => {
    if (!editingProduct) return

    const precioMenor = parseFloat(editPrecioMenor)
    const precioMayor = parseFloat(editPrecioMayor)
    const costoCompra = parseFloat(editCostoCompra)

    if (isNaN(precioMenor) || isNaN(precioMayor) || isNaN(costoCompra) || precioMenor < 0 || precioMayor < 0 || costoCompra < 0) {
      toast.error("Los precios y el costo deben ser números válidos mayores o iguales a 0")
      return
    }

    setUpdating(true)

    try {
      const updated = await api.actualizarProducto(editingProduct.id, {
        precio_menor: precioMenor,
        precio_mayor: precioMayor,
        costo: costoCompra,
      })

      // Actualizar el producto en la lista
      setProductos((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      )

      toast.success(`Producto "${editingProduct.nombre}" actualizado correctamente`)
      setEditingProduct(null)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Error al actualizar el producto")
      }
    } finally {
      setUpdating(false)
    }
  }

  // Paginación
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(offset - ITEMS_PER_PAGE)
    }
  }

  const handleNextPage = () => {
    if (offset + ITEMS_PER_PAGE < total) {
      setOffset(offset + ITEMS_PER_PAGE)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Search Section */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-12">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={fetchProductos}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Results Count & Pagination Info */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm sm:text-lg font-semibold text-brand-dark">
          {loading ? (
            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
          ) : (
            <>{total.toLocaleString()} <span className="hidden sm:inline">productos encontrados</span><span className="sm:hidden">productos</span></>
          )}
        </h3>
        {total > ITEMS_PER_PAGE && !loading && (
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {currentPage}/{totalPages}
          </div>
        )}
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-3 sm:pb-4">
                <Skeleton className="h-4 w-20 sm:w-24 mb-2" />
                <Skeleton className="h-5 w-full" />
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Skeleton className="h-20 sm:h-24 w-full rounded-lg" />
                  <Skeleton className="h-20 sm:h-24 w-full rounded-lg" />
                </div>
                <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          {productos.map((producto) => (
            <Card key={producto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white pb-3 sm:pb-4 p-3 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mb-1 sm:mb-2 font-mono text-[10px] sm:text-xs">
                      {producto.id}
                    </Badge>
                    <CardTitle className="text-sm sm:text-base font-bold text-brand-dark leading-tight line-clamp-2">
                      {producto.nombre}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                    onClick={() => handleEdit(producto)}
                  >
                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4 p-3 sm:p-6">
                {/* Price Display */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="rounded-lg bg-[#006AC0] p-2 sm:p-4 text-white">
                    <div className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 opacity-90">MENOR</div>
                    <div className="text-base sm:text-xl font-bold">
                      ${producto.precio_menor.toLocaleString("es-AR")}
                    </div>
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 opacity-75 hidden sm:block">Minorista</div>
                  </div>
                  <div className="rounded-lg bg-[#FF1F8F] p-2 sm:p-4 text-white">
                    <div className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 opacity-90">MAYOR</div>
                    <div className="text-base sm:text-xl font-bold">
                      ${producto.precio_mayor.toLocaleString("es-AR")}
                    </div>
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 opacity-75 hidden sm:block">Mayorista</div>
                  </div>
                  <div className="rounded-lg bg-gray-600 p-2 sm:p-4 text-white">
                    <div className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 opacity-90">COSTO</div>
                    <div className="text-base sm:text-xl font-bold">
                      ${producto.costo.toLocaleString("es-AR")}
                    </div>
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 opacity-75 hidden sm:block">Compra</div>
                  </div>
                </div>

                {/* Info Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge className="bg-[#6CBEFA] hover:bg-[#6CBEFA]/90 text-white">
                    {producto.categoria}
                  </Badge>
                  {producto.unidad && (
                    <Badge variant="outline" className="text-xs">
                      {producto.unidad}
                    </Badge>
                  )}
                  {producto.precio_menor === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Sin precio menor
                    </Badge>
                  )}
                  {producto.precio_mayor === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Sin precio mayor
                    </Badge>
                  )}
                </div>

                {/* Código de barras si existe */}
                {producto.codigo_barra && (
                  <div className="mt-3 text-xs text-muted-foreground font-mono">
                    Cód. Barras: {producto.codigo_barra}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && productos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-brand-dark">No se encontraron productos</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery
                ? "Intenta con otros términos de búsqueda"
                : "No hay productos en esta categoría"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {total > ITEMS_PER_PAGE && !loading && (
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={offset === 0}
            className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground text-center">
            {offset + 1}-{Math.min(offset + ITEMS_PER_PAGE, total)} de {total}
          </span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={offset + ITEMS_PER_PAGE >= total}
            className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Precios</DialogTitle>
            <DialogDescription>
              {editingProduct?.nombre}
              <br />
              <span className="font-mono text-xs">{editingProduct?.id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="precio-menor" className="text-right">
                Precio Menor
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="precio-menor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrecioMenor}
                  onChange={(e) => setEditPrecioMenor(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="precio-mayor" className="text-right">
                Precio Mayor
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="precio-mayor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrecioMayor}
                  onChange={(e) => setEditPrecioMayor(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="costo-compra" className="text-right">
                Costo
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="costo-compra"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editCostoCompra}
                  onChange={(e) => setEditCostoCompra(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)} disabled={updating}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={updating}
              className="bg-[#006AC0] hover:bg-[#005a9e]"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
