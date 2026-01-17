"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Package, Edit2, X, Check, AlertCircle, Loader2, ChevronLeft, ChevronRight, Trash2, Info, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { api, Producto, ApiError } from "@/lib/api"
import { useCategorias } from "@/hooks/use-categorias"
import { toast } from "sonner"
import { PrecioUnitario } from "@/components/productos/PrecioUnitario"
import { DeleteProductDialog } from "@/components/productos/DeleteProductDialog"
import { ProductFormDialog } from "@/components/productos/ProductFormDialog"

const ITEMS_PER_PAGE = 20

export default function PriceConsultationView() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [showDeleted, setShowDeleted] = useState(false)

  // Estado para el modal de edición/creación
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)

  // Estado para el modal de eliminación
  const [deletingProduct, setDeletingProduct] = useState<Producto | null>(null)

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
        incluirEliminados: showDeleted,
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
  }, [searchQuery, selectedCategory, showDeleted, offset])

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

  // Reset offset cuando cambia la búsqueda, categoría o filtro de eliminados
  useEffect(() => {
    setOffset(0)
  }, [searchQuery, selectedCategory, showDeleted])

  // Función para abrir modal de edición (ahora solo setea el estado)
  // handleEdit ya no necesita setear estados individuales

  // Función para eliminar producto (soft delete)
  const handleDelete = async (motivo: string) => {
    if (!deletingProduct) return

    try {
      await api.softDeleteProducto(deletingProduct.id, motivo)

      // Remover el producto de la lista
      setProductos((prev) => prev.filter((p) => p.id !== deletingProduct.id))
      setTotal((prev) => prev - 1)

      toast.success(`Producto "${deletingProduct.nombre}" eliminado correctamente`)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Error al eliminar el producto")
      }
      throw err
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
            <div className="flex gap-2 sm:gap-4 items-center">
              <Button
                onClick={() => setCreatingProduct(true)}
                className="bg-[#006AC0] hover:bg-[#005a9e] whitespace-nowrap"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Producto</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-deleted"
                  checked={showDeleted}
                  onCheckedChange={(c) => setShowDeleted(c === true)}
                />
                <Label htmlFor="show-deleted" className="text-sm cursor-pointer select-none">Mostrar eliminados</Label>
              </div>
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
                    {producto.estado === 'eliminado' && (
                      <Badge variant="destructive" className="ml-2 mb-1 sm:mb-2 text-[10px] sm:text-xs">
                        ELIMINADO
                      </Badge>
                    )}
                    <CardTitle className="text-sm sm:text-base font-bold text-brand-dark leading-tight line-clamp-2">
                      {producto.nombre}
                    </CardTitle>
                    {producto.descripcion && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 cursor-help">
                              <Info className="h-3 w-3 inline mr-1" />
                              {producto.descripcion}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{producto.descripcion}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                      onClick={() => setEditingProduct(producto)}
                    >
                      <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setDeletingProduct(producto)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
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

                {/* Unit Prices (per kg or per liter) */}
                <PrecioUnitario producto={producto} className="mb-3" />

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
                  {producto.permite_venta_fraccionada && (
                    <Badge variant="secondary" className="text-xs">
                      Venta fraccionada
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

                {/* Codigo de barras si existe */}
                {producto.codigo_barra && (
                  <div className="mt-3 text-xs text-muted-foreground font-mono">
                    Cod. Barras: {producto.codigo_barra}
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

      {/* Edit/Create Dialog */}
      <ProductFormDialog
        open={!!editingProduct || creatingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null)
            setCreatingProduct(false)
          }
        }}
        productoEditar={editingProduct}
        onSuccess={(producto) => {
          // If edited, update in place
          if (editingProduct) {
            setProductos((prev) => prev.map((p) => (p.id === producto.id ? producto : p)))
          } else {
            // If created, add to top and update total
            setProductos((prev) => [producto, ...prev])
            setTotal((prev) => prev + 1)
          }
        }}
      />

      {/* Delete Dialog */}
      <DeleteProductDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        producto={deletingProduct}
        onConfirm={handleDelete}
      />
    </div>
  )
}
