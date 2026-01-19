"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Package, Printer, ChevronLeft, ChevronRight, Tag, X, Minus, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, Producto, ApiError } from "@/lib/api"
import { useCategorias } from "@/hooks/use-categorias"
import { LabelGrid } from "@/components/productos/LabelGrid"

const ITEMS_PER_PAGE = 20

interface SelectedProduct {
    producto: Producto
    cantidad: number
}

export default function EtiquetasPage() {
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [productos, setProductos] = useState<Producto[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [offset, setOffset] = useState(0)

    // Selection state
    const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map())

    // Print preview state
    const [showPrintPreview, setShowPrintPreview] = useState(false)

    const { categorias } = useCategorias()
    const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
    const printRef = useRef<HTMLDivElement>(null)

    // Fetch products
    const fetchProductos = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const result = await api.listarProductos({
                query: searchQuery || undefined,
                categoria: selectedCategory !== "all" ? selectedCategory : undefined,
                incluirEliminados: false,
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

    // Debounce search
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

    // Reset offset when search/category changes
    useEffect(() => {
        setOffset(0)
    }, [searchQuery, selectedCategory])

    // Toggle product selection
    const toggleProduct = (producto: Producto) => {
        const newSelected = new Map(selectedProducts)
        if (newSelected.has(producto.id)) {
            newSelected.delete(producto.id)
        } else {
            newSelected.set(producto.id, { producto, cantidad: 1 })
        }
        setSelectedProducts(newSelected)
    }

    // Update quantity for a selected product
    const updateQuantity = (productId: string, cantidad: number) => {
        if (cantidad < 1) return
        const newSelected = new Map(selectedProducts)
        const item = newSelected.get(productId)
        if (item) {
            newSelected.set(productId, { ...item, cantidad })
            setSelectedProducts(newSelected)
        }
    }

    // Calculate total labels
    const totalLabels = Array.from(selectedProducts.values()).reduce(
        (sum, item) => sum + item.cantidad,
        0
    )

    // Pagination
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

    // Handle print
    const handlePrint = () => {
        window.print()
    }

    // Get items for printing
    const printItems = Array.from(selectedProducts.values())

    return (
        <>
            <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden print:hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-brand-dark">Imprimir Etiquetas</h1>
                        <p className="text-muted-foreground">Selecciona productos y genera etiquetas para imprimir</p>
                    </div>
                </div>

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
                    </CardContent>
                </Card>

                {/* Results Count */}
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-lg font-semibold text-brand-dark">
                        {loading ? (
                            <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
                        ) : (
                            <>{total.toLocaleString()} productos</>
                        )}
                    </h3>
                    {total > ITEMS_PER_PAGE && !loading && (
                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                            {currentPage}/{totalPages}
                        </div>
                    )}
                </div>

                {/* Product Table */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="w-12 p-3 text-left"></th>
                                        <th className="p-3 text-left font-medium">Código</th>
                                        <th className="p-3 text-left font-medium">Producto</th>
                                        <th className="p-3 text-left font-medium">Categoría</th>
                                        <th className="p-3 text-right font-medium">Precio</th>
                                        <th className="w-32 p-3 text-center font-medium">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="border-b">
                                                <td className="p-3"><Skeleton className="h-5 w-5" /></td>
                                                <td className="p-3"><Skeleton className="h-5 w-20" /></td>
                                                <td className="p-3"><Skeleton className="h-5 w-48" /></td>
                                                <td className="p-3"><Skeleton className="h-5 w-24" /></td>
                                                <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                                                <td className="p-3"><Skeleton className="h-8 w-24 mx-auto" /></td>
                                            </tr>
                                        ))
                                    ) : productos.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                No se encontraron productos
                                            </td>
                                        </tr>
                                    ) : (
                                        productos.map((producto) => {
                                            const isSelected = selectedProducts.has(producto.id)
                                            const selectedItem = selectedProducts.get(producto.id)

                                            return (
                                                <tr
                                                    key={producto.id}
                                                    className={`border-b hover:bg-muted/30 transition-colors ${isSelected ? "bg-blue-50" : ""
                                                        }`}
                                                >
                                                    <td className="p-3">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleProduct(producto)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {producto.id}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 font-medium max-w-xs truncate" title={producto.nombre}>
                                                        {producto.nombre}
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge className="bg-[#6CBEFA] hover:bg-[#6CBEFA]/90 text-white text-xs">
                                                            {producto.categoria}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right font-semibold text-[#006AC0]">
                                                        ${producto.precio_menor.toLocaleString("es-AR")}
                                                    </td>
                                                    <td className="p-3">
                                                        {isSelected && selectedItem && (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => updateQuantity(producto.id, selectedItem.cantidad - 1)}
                                                                    disabled={selectedItem.cantidad <= 1}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    value={selectedItem.cantidad}
                                                                    onChange={(e) => updateQuantity(producto.id, parseInt(e.target.value) || 1)}
                                                                    className="w-14 h-7 text-center text-sm"
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => updateQuantity(producto.id, selectedItem.cantidad + 1)}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

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

                {/* Floating Action Button */}
                {selectedProducts.size > 0 && (
                    <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-40">
                        <Button
                            size="lg"
                            className="bg-[#006AC0] hover:bg-[#005a9e] shadow-lg gap-2 text-base px-6"
                            onClick={() => setShowPrintPreview(true)}
                        >
                            <Tag className="h-5 w-5" />
                            Generar Etiquetas ({totalLabels})
                        </Button>
                    </div>
                )}

                {/* Selection Summary */}
                {selectedProducts.size > 0 && (
                    <Card className="border-[#006AC0]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Selección Actual</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(selectedProducts.values()).map(({ producto, cantidad }) => (
                                    <Badge
                                        key={producto.id}
                                        variant="secondary"
                                        className="gap-1 pl-2 pr-1 py-1"
                                    >
                                        {producto.nombre.substring(0, 25)}
                                        {producto.nombre.length > 25 && "..."}
                                        <span className="ml-1 font-bold">×{cantidad}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 ml-1 hover:bg-destructive/20"
                                            onClick={() => toggleProduct(producto)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-3">
                                {selectedProducts.size} productos · {totalLabels} etiquetas totales
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Print Preview Modal */}
            {showPrintPreview && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center print:hidden">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Vista Previa de Impresión</h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowPrintPreview(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-3xl font-bold text-[#006AC0] mb-2">{totalLabels}</p>
                            <p className="text-muted-foreground">etiquetas listas para imprimir</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {selectedProducts.size} productos seleccionados
                            </p>
                        </div>

                        <div className="bg-muted p-4 rounded-lg mb-4">
                            <h4 className="font-medium mb-2">Resumen:</h4>
                            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                                {Array.from(selectedProducts.values()).map(({ producto, cantidad }) => (
                                    <li key={producto.id} className="flex justify-between">
                                        <span className="truncate mr-2">{producto.nombre}</span>
                                        <span className="font-medium shrink-0">×{cantidad}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handlePrint} className="flex-1 bg-[#006AC0] hover:bg-[#005a9e]">
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir
                            </Button>
                            <Button variant="outline" onClick={() => setShowPrintPreview(false)} className="flex-1">
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Content (hidden on screen, visible when printing) */}
            <div className="hidden print:block">
                <LabelGrid ref={printRef} items={printItems} />
            </div>

            {/* Print Styles */}
            <style jsx global>{`
        @media print {
          /* Hide everything except labels */
          body * {
            visibility: hidden;
          }

          body {
            background: #FFFFFF !important;
            margin: 0;
            padding: 0;
          }

          .labels-print-container,
          .labels-print-container * {
            visibility: visible;
          }

          .labels-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #FFFFFF !important;
          }

          .labels-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2mm;
            padding: 0;
          }

          .price-label {
            border: 1px dashed #999;
            padding: 4mm;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
            background: #FFFFFF !important;
            box-sizing: border-box;
            min-height: 35mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .label-brand {
            font-size: 8pt;
            font-weight: bold;
            color: #006AC0;
            letter-spacing: 1px;
            margin-bottom: 1mm;
          }

          .label-product-name {
            font-size: 9pt;
            font-weight: 600;
            line-height: 1.2;
            max-height: 10mm;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-bottom: 2mm;
          }

          .label-price {
            font-size: 18pt;
            font-weight: 900;
            color: #000;
            margin: 2mm 0;
          }

          .label-unit-price {
            font-size: 8pt;
            color: #666;
            margin-top: 1mm;
          }

          .label-category {
            font-size: 7pt;
            color: #888;
            margin-top: 1mm;
            text-transform: uppercase;
          }

          /* Hide navigation and other elements */
          header, nav, aside, footer, .sidebar, button {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
        </>
    )
}
