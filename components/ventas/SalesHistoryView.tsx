"use client"

import { useState, useEffect, useCallback } from "react"
import { Eye, Search, AlertCircle, FileText, Calendar } from "lucide-react"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api, Venta, ApiError, VentaProductoExtendido } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

const ITEMS_PER_PAGE = 20

export default function SalesHistoryView() {
    const [ventas, setVentas] = useState<Venta[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [selectedSale, setSelectedSale] = useState<Venta | null>(null)
    const [filterDate, setFilterDate] = useState("")

    const fetchVentas = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const offset = (page - 1) * ITEMS_PER_PAGE
            const result = await api.listarVentas({
                limit: ITEMS_PER_PAGE,
                offset,
                fecha_inicio: filterDate ? `${filterDate}T00:00:00` : undefined,
                fecha_fin: filterDate ? `${filterDate}T23:59:59` : undefined,
            })
            setVentas(result.ventas)
            setTotal(result.total)
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message)
            } else {
                setError("Error al cargar el historial de ventas")
            }
        } finally {
            setLoading(false)
        }
    }, [page, filterDate])

    useEffect(() => {
        fetchVentas()
    }, [fetchVentas])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= Math.ceil(total / ITEMS_PER_PAGE)) {
            setPage(newPage)
        }
    }

    // Type guard or helper to check for extended product properties
    const isExtended = (p: any): p is VentaProductoExtendido => {
        return 'tipo_precio' in p || 'descuento_linea' in p;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-dark">Historial de Ventas</h1>
                    <p className="text-sm text-muted-foreground">Registro completo de transacciones</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">Filtrar fecha:</span>
                    <Input
                        type="date"
                        className="w-auto"
                        value={filterDate}
                        onChange={(e) => {
                            setFilterDate(e.target.value)
                            setPage(1) // Reset to first page on filter change
                        }}
                    />
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Metodo Pago</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : ventas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No se encontraron ventas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                ventas.map((venta) => (
                                    <TableRow key={venta.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(venta.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>{venta.cliente_nombre || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{venta.metodo_pago}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={venta.tipo_venta === 'MAYOR' ? 'bg-[#FF1F8F]' : 'bg-[#006AC0]'}>
                                                {venta.tipo_venta}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            ${venta.total.toLocaleString("es-AR")}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedSale(venta)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {total > ITEMS_PER_PAGE && (
                <div className="flex justify-center gap-2 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1 || loading}
                    >
                        Anterior
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                        Pagina {page} de {Math.ceil(total / ITEMS_PER_PAGE)}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= Math.ceil(total / ITEMS_PER_PAGE) || loading}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            {/* Sale Detail Dialog */}
            <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Detalle de Venta</span>
                            <span className="text-sm font-normal text-muted-foreground font-mono">
                                #{selectedSale?.id.slice(0, 8)}
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            Realizada el {selectedSale && format(new Date(selectedSale.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSale && (
                        <div className="space-y-6">
                            {/* Sale Info */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Cliente</span>
                                    <span className="font-medium">{selectedSale.cliente_nombre || 'General'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Pago</span>
                                    <span className="font-medium">{selectedSale.metodo_pago}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Tipo</span>
                                    <Badge className={selectedSale.tipo_venta === 'MAYOR' ? 'bg-[#FF1F8F]' : 'bg-[#006AC0]'}>
                                        {selectedSale.tipo_venta}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Total</span>
                                    <span className="font-bold text-lg text-brand-dark">
                                        ${selectedSale.total.toLocaleString("es-AR")}
                                    </span>
                                </div>
                            </div>

                            {/* Authorization & Global Discount Info */}
                            {(selectedSale.descuento_global || 0) > 0 && (
                                <Alert className="bg-yellow-50 border-yellow-200">
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription className="text-yellow-700">
                                        <strong>Descuento Global Aplicado: </strong>
                                        ${selectedSale.descuento_global?.toLocaleString("es-AR")} ({selectedSale.descuento_global_porcentaje}%)
                                        {selectedSale.descuento_global_motivo && (
                                            <div className="text-xs mt-1">Motivo: "{selectedSale.descuento_global_motivo}"</div>
                                        )}
                                        {selectedSale.requirio_autorizacion && (
                                            <div className="text-xs mt-1 font-semibold flex items-center gap-1">
                                                <FileText className="h-3 w-3" /> Requirió Autorización
                                                {selectedSale.autorizado_por && ` (Por: ${selectedSale.autorizado_por})`}
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Products Table */}
                            <div>
                                <h3 className="font-semibold mb-3">Productos</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="text-right">Cant.</TableHead>
                                                <TableHead className="text-right">Precio Unit.</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedSale.productos.map((prod: any, idx) => {
                                                const isCustom = isExtended(prod) && prod.tipo_precio === 'custom';
                                                const hasLineDiscount = isExtended(prod) && (prod.descuento_linea || 0) > 0;

                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span>{prod.nombre_producto}</span>
                                                                {isExtended(prod) && prod.tipo_precio && prod.tipo_precio !== 'custom' && (
                                                                    <span className="text-[10px] text-muted-foreground uppercase">
                                                                        Precio {prod.tipo_precio}
                                                                    </span>
                                                                )}
                                                                {isCustom && (
                                                                    <span className="text-[10px] text-orange-600 font-medium">
                                                                        Precio Manual
                                                                    </span>
                                                                )}
                                                                {hasLineDiscount && (
                                                                    <span className="text-[10px] text-green-600">
                                                                        Desc. {prod.descuento_linea_porcentaje}% ({prod.motivo_descuento})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">{prod.cantidad}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span>${prod.precio_unitario.toLocaleString("es-AR")}</span>
                                                                {hasLineDiscount && isExtended(prod) && prod.precio_lista_menor && (
                                                                    <span className="text-[10px] text-muted-foreground line-through">
                                                                        ${prod.precio_lista_menor.toLocaleString("es-AR")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            ${prod.subtotal.toLocaleString("es-AR")}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
