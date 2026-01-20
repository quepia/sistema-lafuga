"use client"

import TicketPrint from "@/components/ticket-print"
import ThermalTicket from "@/components/ThermalTicket"
import { PrintOptionsDialog, PrintFormat } from "@/components/PrintOptionsDialog"
import { useState, useEffect, useCallback } from "react"
import { Eye, Search, AlertCircle, FileText, Calendar, Printer, Trash2 } from "lucide-react"
import { DeleteTicketDialog } from "@/components/ventas/DeleteTicketDialog"
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
    const [showTicket, setShowTicket] = useState(false)
    const [showPrintOptions, setShowPrintOptions] = useState(false)
    const [printFormat, setPrintFormat] = useState<PrintFormat>(null)
    const [filterDate, setFilterDate] = useState("")
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [saleToDelete, setSaleToDelete] = useState<Venta | null>(null)

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

    const handleDeleteTicket = async () => {
        if (!saleToDelete) return

        try {
            await api.eliminarVenta(saleToDelete.id)
            setVentas(prev => prev.filter(v => v.id !== saleToDelete.id))
            setTotal(prev => prev - 1)
            setShowDeleteDialog(false)
            setSaleToDelete(null)
        } catch (error) {
            console.error("Error al eliminar venta:", error)
            setError("No se pudo eliminar la venta. Intente nuevamente.")
        }
    }

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
                <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[600px]">
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
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSaleToDelete(venta)
                                                        setShowDeleteDialog(true)
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setSelectedSale(venta)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
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
                <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
                    <DialogTitle className="sr-only">Detalle de Venta</DialogTitle>
                    {selectedSale && (
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold">Detalle de Venta</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(selectedSale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button size="sm" variant="outline" onClick={() => setShowPrintOptions(true)}>
                                        <Printer className="h-4 w-4 mr-1" />
                                        Imprimir
                                    </Button>
                                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                        #{selectedSale.id.slice(0, 8).toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Summary Grid - 2 columns always */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Cliente</p>
                                    <p className="font-medium text-sm truncate">
                                        {selectedSale.cliente_nombre || 'General'}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Pago</p>
                                    <p className="font-medium text-sm">{selectedSale.metodo_pago}</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Tipo</p>
                                    <Badge className={`${selectedSale.tipo_venta === 'MAYOR' ? 'bg-[#FF1F8F]' : 'bg-[#006AC0]'} text-xs mt-1`}>
                                        {selectedSale.tipo_venta}
                                    </Badge>
                                </div>
                                <div className="bg-brand-dark text-white rounded-lg p-3">
                                    <p className="text-xs opacity-80">Total</p>
                                    <p className="font-bold text-lg">
                                        ${selectedSale.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                                    Productos ({selectedSale.productos.length})
                                </p>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {selectedSale.productos.map((prod: any, idx) => {
                                        const isCustom = isExtended(prod) && prod.tipo_precio === 'custom';

                                        return (
                                            <div key={idx} className="border rounded-lg p-2 text-sm">
                                                <div className="flex justify-between gap-2">
                                                    <span className="font-medium truncate flex-1">{prod.nombre_producto}</span>
                                                    <span className="font-bold whitespace-nowrap">
                                                        ${prod.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                    <span>
                                                        {prod.cantidad} × ${prod.precio_unitario.toLocaleString("es-AR")}
                                                        {isExtended(prod) && prod.tipo_precio && prod.tipo_precio !== 'custom' && (
                                                            <span className="ml-1 uppercase">({prod.tipo_precio})</span>
                                                        )}
                                                        {isCustom && <span className="ml-1 text-orange-600">(Manual)</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Print Options Dialog */}
            {selectedSale && (
                <PrintOptionsDialog
                    open={showPrintOptions}
                    onOpenChange={setShowPrintOptions}
                    onSelect={(format) => {
                        setPrintFormat(format)
                        if (format) {
                            setShowTicket(true)
                        }
                    }}
                    total={selectedSale.total}
                    ticketId={selectedSale.id}
                    clienteNombre={selectedSale.cliente_nombre || undefined}
                />
            )}

            {/* A4 Print Overlay */}
            {showTicket && selectedSale && printFormat === "a4" && (
                <TicketPrint
                    venta={selectedSale}
                    onClose={() => {
                        setShowTicket(false)
                        setPrintFormat(null)
                    }}
                />
            )}

            {/* Thermal Ticket Print Overlay */}
            {showTicket && selectedSale && printFormat === "thermal" && (
                <ThermalTicket
                    venta={selectedSale}
                    onClose={() => {
                        setShowTicket(false)
                        setPrintFormat(null)
                    }}
                />
            )}

            <DeleteTicketDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                venta={saleToDelete}
                onConfirm={handleDeleteTicket}
            />
        </div>
    )
}
