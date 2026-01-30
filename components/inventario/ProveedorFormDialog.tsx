"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, Proveedor, ProveedorInsert, ApiError } from "@/lib/api"
import { toast } from "sonner"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  proveedorEditar?: Proveedor | null
}

export function ProveedorFormDialog({ open, onOpenChange, onSuccess, proveedorEditar }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProveedorInsert>({
    nombre: "",
    cuit: "",
    contacto: "",
    telefono: "",
    email: "",
    direccion: "",
    condicion_pago: "",
    notas: "",
  })

  const isEditing = !!proveedorEditar

  useEffect(() => {
    if (open) {
      if (proveedorEditar) {
        setFormData({
          nombre: proveedorEditar.nombre,
          cuit: proveedorEditar.cuit || "",
          contacto: proveedorEditar.contacto || "",
          telefono: proveedorEditar.telefono || "",
          email: proveedorEditar.email || "",
          direccion: proveedorEditar.direccion || "",
          condicion_pago: proveedorEditar.condicion_pago || "",
          notas: proveedorEditar.notas || "",
        })
      } else {
        setFormData({
          nombre: "",
          cuit: "",
          contacto: "",
          telefono: "",
          email: "",
          direccion: "",
          condicion_pago: "",
          notas: "",
        })
      }
    }
  }, [open, proveedorEditar])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre.trim()) {
      toast.error("El nombre del proveedor es obligatorio")
      return
    }

    setLoading(true)
    try {
      if (isEditing) {
        await api.actualizarProveedor(proveedorEditar.id, formData)
        toast.success("Proveedor actualizado correctamente")
      } else {
        await api.crearProveedor(formData)
        toast.success("Proveedor creado exitosamente")
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Error al guardar proveedor")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modificá los datos del proveedor."
              : "Ingresá los datos del nuevo proveedor."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nombre">
                Nombre / Razón Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Distribuidora Sur S.A."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={formData.cuit || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
                placeholder="Ej: 30-12345678-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacto">Persona de Contacto</Label>
              <Input
                id="contacto"
                value={formData.contacto || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                placeholder="Nombre del contacto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="Ej: +54 11 1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contacto@proveedor.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condicion_pago">Condición de Pago</Label>
              <Select
                value={formData.condicion_pago || ""}
                onValueChange={(v) => setFormData(prev => ({ ...prev, condicion_pago: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contado">Contado</SelectItem>
                  <SelectItem value="15 días">15 días</SelectItem>
                  <SelectItem value="30 días">30 días</SelectItem>
                  <SelectItem value="60 días">60 días</SelectItem>
                  <SelectItem value="Cuenta corriente">Cuenta corriente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas / Observaciones</Label>
            <Textarea
              id="notas"
              value={formData.notas || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Observaciones sobre el proveedor..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#006AC0] hover:bg-[#005a9e]">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
