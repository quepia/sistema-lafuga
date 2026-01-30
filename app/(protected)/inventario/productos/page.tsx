"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, ClipboardList, AlertTriangle, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { api, Producto } from "@/lib/api"

type FiltroStock = "todos" | "con_stock" | "sin_stock" | "bajo_stock"

export default function StockProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [filtroStock, setFiltroStock] = useState<FiltroStock>("todos")
  const [page, setPage] = useState(0)
  const LIMIT = 50

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.listarProductos({
        query: debouncedQuery || undefined,
        limit: LIMIT,
        offset: page * LIMIT,
      })
      setProductos(result.productos)
      setTotal(result.total)
    } catch (err) {
      console.error("Error cargando productos:", err)
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter products by stock status client-side
  const productosFiltrados = productos.filter((p) => {
    const stock = (p as any).stock_actual ?? 0
    const minimo = (p as any).stock_minimo ?? 0
    switch (filtroStock) {
      case "con_stock":
        return stock > 0
      case "sin_stock":
        return stock <= 0
      case "bajo_stock":
        return minimo > 0 && stock <= minimo
      default:
        return true
    }
  })

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock de Productos</h1>
        <p className="text-muted-foreground">Consulta el stock actual de todos los productos</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {total} producto{total !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={filtroStock}
                onValueChange={(v) => setFiltroStock(v as FiltroStock)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="con_stock">Con stock</SelectItem>
                  <SelectItem value="sin_stock">Sin stock</SelectItem>
                  <SelectItem value="bajo_stock">Stock bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedQuery ? "No se encontraron productos" : "No hay productos"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Stock Mínimo</TableHead>
                      <TableHead className="text-right">Stock Máximo</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosFiltrados.map((producto) => {
                      const stockActual = (producto as any).stock_actual ?? 0
                      const stockMinimo = (producto as any).stock_minimo ?? 0
                      const stockMaximo = (producto as any).stock_maximo ?? null
                      const esBajoStock = stockMinimo > 0 && stockActual <= stockMinimo
                      const esCritico = stockMinimo > 0 && stockActual <= stockMinimo * 0.5
                      const sinStock = stockActual <= 0

                      return (
                        <TableRow key={producto.id}>
                          <TableCell className="font-mono text-sm">{producto.id}</TableCell>
                          <TableCell className="font-medium">{producto.nombre}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {producto.categoria || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span
                              className={
                                sinStock
                                  ? "text-red-600 font-semibold"
                                  : esCritico
                                    ? "text-red-500"
                                    : esBajoStock
                                      ? "text-orange-500"
                                      : ""
                              }
                            >
                              {stockActual}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {stockMinimo || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {stockMaximo ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${producto.costo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {sinStock ? (
                              <Badge variant="destructive">Sin stock</Badge>
                            ) : esCritico ? (
                              <Badge variant="destructive">Crítico</Badge>
                            ) : esBajoStock ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                Bajo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
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
    </div>
  )
}
