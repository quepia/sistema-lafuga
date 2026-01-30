"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Phone, Mail, ToggleLeft, ToggleRight, Edit2, Truck } from "lucide-react"
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
import { useProveedores } from "@/hooks/use-proveedores"
import { ProveedorFormDialog } from "@/components/inventario/ProveedorFormDialog"
import { api, Proveedor, ApiError } from "@/lib/api"
import { toast } from "sonner"

export default function ProveedoresPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [showInactivos, setShowInactivos] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { proveedores, total, isLoading, mutate } = useProveedores({
    query: debouncedQuery || undefined,
    activo: showInactivos ? undefined : true,
    limit: 100,
  })

  const handleToggleActivo = useCallback(async (proveedor: Proveedor) => {
    try {
      if (proveedor.activo) {
        await api.desactivarProveedor(proveedor.id)
        toast.success(`${proveedor.nombre} desactivado`)
      } else {
        await api.activarProveedor(proveedor.id)
        toast.success(`${proveedor.nombre} activado`)
      }
      mutate()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error("Error al cambiar estado del proveedor")
      }
    }
  }, [mutate])

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditingProveedor(null)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    mutate()
    setEditingProveedor(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">Gestión de proveedores de mercadería</p>
        </div>
        <Button onClick={handleNew} className="bg-[#006AC0] hover:bg-[#005a9e]">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {total} proveedor{total !== 1 ? "es" : ""}
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, CUIT o contacto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={showInactivos ? "default" : "outline"}
                size="sm"
                onClick={() => setShowInactivos(!showInactivos)}
                className="whitespace-nowrap"
              >
                {showInactivos ? "Todos" : "Solo activos"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando proveedores...</div>
          ) : proveedores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedQuery ? "No se encontraron proveedores" : "No hay proveedores registrados"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Condición de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proveedores.map((proveedor) => (
                    <TableRow key={proveedor.id} className={!proveedor.activo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                      <TableCell className="font-mono text-sm">{proveedor.cuit || "—"}</TableCell>
                      <TableCell>{proveedor.contacto || "—"}</TableCell>
                      <TableCell>
                        {proveedor.telefono ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {proveedor.telefono}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{proveedor.condicion_pago || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={proveedor.activo ? "default" : "secondary"}>
                          {proveedor.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(proveedor)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActivo(proveedor)}
                            title={proveedor.activo ? "Desactivar" : "Activar"}
                          >
                            {proveedor.activo ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProveedorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
        proveedorEditar={editingProveedor}
      />
    </div>
  )
}
