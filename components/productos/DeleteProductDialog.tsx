"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Producto } from "@/lib/supabase"
import { api } from "@/lib/api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  producto: Producto | null
  onConfirm: (motivo: string) => Promise<void>
}

/**
 * Dialog for soft-deleting a product
 * Shows warnings if the product has been used in sales
 */
export function DeleteProductDialog({ open, onOpenChange, producto, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingVentas, setCheckingVentas] = useState(false)
  const [tieneVentas, setTieneVentas] = useState<boolean | null>(null)

  // Check if product has sales when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && producto) {
      setCheckingVentas(true)
      try {
        const hasVentas = await api.productoTieneVentas(producto.id)
        setTieneVentas(hasVentas)
      } catch (error) {
        console.error("Error checking ventas:", error)
        setTieneVentas(false)
      } finally {
        setCheckingVentas(false)
      }
    } else {
      setMotivo("")
      setTieneVentas(null)
    }
    onOpenChange(isOpen)
  }

  const handleConfirm = async () => {
    if (!producto) return

    setLoading(true)
    try {
      await onConfirm(motivo || "Eliminado por el usuario")
      setMotivo("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting product:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!producto) return null

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar Eliminacion
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium text-foreground">{producto.nombre}</p>
                <p className="text-sm">Codigo: <span className="font-mono">{producto.id}</span></p>
                {producto.categoria && (
                  <p className="text-sm">Categoria: {producto.categoria}</p>
                )}
              </div>

              {checkingVentas ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando historial de ventas...
                </div>
              ) : tieneVentas ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Este producto tiene ventas registradas.</strong>
                    <br />
                    Se marcara como &quot;eliminado&quot; pero se conservara para mantener el historial de ventas.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm">
                  El producto sera marcado como eliminado y no aparecera en busquedas ni en el POS.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo de eliminacion (opcional):</Label>
                <Input
                  id="motivo"
                  placeholder="Producto descontinuado, error de carga, etc."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar Producto"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteProductDialog
