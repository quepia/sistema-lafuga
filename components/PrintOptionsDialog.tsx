"use client"

import { Receipt, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export type PrintFormat = "thermal" | "a4" | null

interface PrintOptionsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (format: PrintFormat) => void
    total: number
    ticketId: string
    clienteNombre?: string
}

export function PrintOptionsDialog({
    open,
    onOpenChange,
    onSelect,
    total,
    ticketId,
    clienteNombre
}: PrintOptionsDialogProps) {
    const handleSelect = (format: PrintFormat) => {
        onSelect(format)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Venta Registrada</span>
                        <span className="text-sm font-normal text-muted-foreground font-mono">
                            #{ticketId.slice(0, 8).toUpperCase()}
                        </span>
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona el formato de impresión
                    </DialogDescription>
                </DialogHeader>

                {/* Sale Summary */}
                <div className="text-center py-4 border-y">
                    <p className="text-3xl font-bold text-green-600 mb-1">
                        ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {clienteNombre || 'Cliente General'}
                    </p>
                </div>

                {/* Print Options */}
                <div className="grid grid-cols-2 gap-4 py-4">
                    {/* Thermal Ticket Option */}
                    <Button
                        variant="outline"
                        className="h-auto py-6 flex flex-col items-center gap-3 hover:border-[#006AC0] hover:bg-[#006AC0]/5 transition-colors"
                        onClick={() => handleSelect("thermal")}
                    >
                        <div className="w-12 h-12 rounded-full bg-[#006AC0]/10 flex items-center justify-center">
                            <Receipt className="h-6 w-6 text-[#006AC0]" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">Ticket (80mm)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Impresora térmica
                            </p>
                        </div>
                    </Button>

                    {/* A4 Document Option */}
                    <Button
                        variant="outline"
                        className="h-auto py-6 flex flex-col items-center gap-3 hover:border-[#FF1F8F] hover:bg-[#FF1F8F]/5 transition-colors"
                        onClick={() => handleSelect("a4")}
                    >
                        <div className="w-12 h-12 rounded-full bg-[#FF1F8F]/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-[#FF1F8F]" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">Documento (A4)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Original + Duplicado + Triplicado
                            </p>
                        </div>
                    </Button>
                </div>

                {/* Skip printing option */}
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => handleSelect(null)}
                    >
                        <X className="h-4 w-4 mr-2" />
                        No imprimir ahora
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
