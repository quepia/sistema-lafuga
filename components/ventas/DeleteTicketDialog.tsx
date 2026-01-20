"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Venta } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    venta: Venta | null
    onConfirm: () => Promise<void>
}

export function DeleteTicketDialog({ open, onOpenChange, venta, onConfirm }: Props) {
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        if (!venta) return
        if (confirmText !== "ELIMINAR") return

        setLoading(true)
        try {
            await onConfirm()
            setConfirmText("")
            onOpenChange(false)
        } catch (error) {
            console.error("Error deleting ticket:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setConfirmText("")
        }
        onOpenChange(isOpen)
    }

    if (!venta) return null

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="sm:max-w-[500px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Eliminar Ticket de Venta
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4 text-left">
                            <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                    <div className="space-y-2">
                                        <p className="font-medium text-red-900 dark:text-red-200">
                                            ¿Estas seguro de realizar esta accion?
                                        </p>
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            Esta accion eliminara permanentemente el registro de la venta y no se podra recuperar.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Fecha:</span>
                                    <span className="font-medium">
                                        {format(new Date(venta.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cliente:</span>
                                    <span className="font-medium">{venta.cliente_nombre || "Consumidor Final"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-bold text-brand-dark">
                                        ${venta.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-delete" className="text-foreground">
                                    Escribe <span className="font-bold text-destructive">ELIMINAR</span> para confirmar:
                                </Label>
                                <Input
                                    id="confirm-delete"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="ELIMINAR"
                                    className="border-red-200 focus:ring-red-500"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={loading || confirmText !== "ELIMINAR"}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            "Eliminar Definitivamente"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
