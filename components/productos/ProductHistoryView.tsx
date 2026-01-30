"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, History, ArrowLeft, ArrowRight, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { api, HistorialProducto, ApiError } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const ITEMS_PER_PAGE = 50

export default function ProductHistoryView() {
    const [searchQuery, setSearchQuery] = useState("")
    const [historial, setHistorial] = useState<HistorialProducto[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Note: The API currently only supports filtering by product ID, so generic search needs implementation
    // For now we'll fetch recent history if no search, or search by exact ID if it looks like one.
    // Actually, let's assume we want to view history for a specific product or global recent history.
    // The current api.obtenerHistorialProducto takes ID.
    // We might need to update API to get GLOBAL history or just recent changes if ID is null.
    // Checking api.ts... obtainingHistorialProducto needs ID.
    // I should probably update api.ts to allow fetching global history if I want a main history page.
    // For now, I will assume the user enters a Product ID or I fetch recent global history (which I need to Add to API).

    // Let's create a new API method for global history or just use the existing table directly here?
    // No, better to stick to API layer.
    // I will check if I can modify api.ts to allow optional ID.

    // Component logic assuming I will fix API:
    const fetchGlobalHistory = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // Need to implement this in API or use direct supabase here?
            // Using direct supabase to avoid blocking on API refactor for now?
            // No, stick to api.ts pattern. I will update api.ts next.
            // For now, let's imagine api.obtenerHistorialGlobal exists or obtainingHistorialProducto accepts optional ID.
            // I will use api.obtenerHistorialProducto("") which likely fails or returns nothing safely.

            // Actually, looking at previous turn, I did NOT see `obtenerHistorialGlobal`.
            // I will implement `api.obtenerHistorialReciente` in api.ts next.
            // For now I'll call it.
            const data = await api.obtenerHistorialReciente(50)
            setHistorial(data)
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message)
            } else {
                setError("Error al cargar el historial")
            }
        } finally {
            setLoading(false)
        }
    }, [])

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            fetchGlobalHistory()
            return
        }

        setLoading(true)
        try {
            // If search looks like UUID, search by ID.
            // Otherwise maybe search by SKU? 
            // The table has `codigo_sku`.
            // For now let's just use the query as ID or SKU? 
            // `obtenerHistorialProducto` takes `id_producto`. 
            // We probably need a better search.
            // Let's assume the user searches by Product ID for now as it's most reliable.
            const data = await api.obtenerHistorialProducto(searchQuery, 50)
            setHistorial(data)
        } catch (err) {
            setError("No se encontro historial para ese producto")
            setHistorial([])
        } finally {
            setLoading(false)
        }
    }, [searchQuery, fetchGlobalHistory])

    useEffect(() => {
        fetchGlobalHistory()
    }, [fetchGlobalHistory])

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <History className="h-6 w-6" />
                        Historial de Cambios
                    </h1>
                    <p className="text-muted-foreground">Auditoria de cambios en productos</p>
                </div>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input
                        placeholder="Buscar por ID de producto..."
                        autoComplete="off"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Ultimos Movimientos</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : historial.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay registros de historial
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Campo</TableHead>
                                        <TableHead>Valor Anterior</TableHead>
                                        <TableHead>Valor Nuevo</TableHead>
                                        <TableHead>Usuario</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historial.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs text-muted-foreground">{item.codigo_sku}</span>
                                                    {/* Need to fetch product name? Or just show SKU? 
                                                  Table only has ID and SKU. Ideally we join with products but that's complex for now.
                                                  We will show SKU.
                                              */}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.campo_modificado}</Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={item.valor_anterior || '(vacio)'}>
                                                <span className="text-red-500 line-through text-xs mr-2">
                                                    {item.valor_anterior || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={item.valor_nuevo || '(vacio)'}>
                                                <span className="text-green-600 font-medium text-sm">
                                                    {item.valor_nuevo || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                                    <User className="h-3 w-3" />
                                                    {item.id_usuario ? 'Usuario' : 'Sistema'}
                                                </div>
                                                {item.motivo && (
                                                    <div className="text-[10px] italic mt-1">"{item.motivo}"</div>
                                                )}
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
    )
}
