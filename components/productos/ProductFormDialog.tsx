"use client"

import { useState, useEffect } from "react"
import { Check, X, Loader2, Info, AlertTriangle } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { api, Producto, ProductoInsert, ApiError } from "@/lib/api"
import { useCategorias } from "@/hooks/use-categorias"
import { toast } from "sonner"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (producto: Producto) => void
    // Optional: if editing an existing product. 
    // If undefined, we are creating a new product.
    productoEditar?: Producto | null
}

export function ProductFormDialog({ open, onOpenChange, onSuccess, productoEditar }: Props) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<ProductoInsert>>({
        id: "",
        nombre: "",
        categoria: "",
        precio_menor: 0,
        precio_mayor: 0,
        costo: 0,
        codigo_barra: "",
        descripcion: "",
        peso_neto: null,
        volumen_neto: null,
        permite_venta_fraccionada: false,
        unidad: "u"
    })

    // String states for price inputs to allow proper deletion
    const [precioMenorStr, setPrecioMenorStr] = useState("")
    const [precioMayorStr, setPrecioMayorStr] = useState("")
    const [costoStr, setCostoStr] = useState("")

    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    // To check if we are in "Edit Mode"
    const isEditing = !!productoEditar

    const { categorias, loading: loadingCategorias } = useCategorias()

    // Reset or Load data when dialog opens
    useEffect(() => {
        if (open) {
            if (productoEditar) {
                setFormData({
                    id: productoEditar.id,
                    nombre: productoEditar.nombre,
                    categoria: productoEditar.categoria || "",
                    precio_menor: productoEditar.precio_menor,
                    precio_mayor: productoEditar.precio_mayor,
                    costo: productoEditar.costo,
                    codigo_barra: productoEditar.codigo_barra || "",
                    descripcion: productoEditar.descripcion || "",
                    peso_neto: productoEditar.peso_neto,
                    volumen_neto: productoEditar.volumen_neto,
                    permite_venta_fraccionada: productoEditar.permite_venta_fraccionada || false,
                    unidad: productoEditar.unidad || "u",
                })
                // Initialize string states for prices
                setPrecioMenorStr(productoEditar.precio_menor?.toString() || "")
                setPrecioMayorStr(productoEditar.precio_mayor?.toString() || "")
                setCostoStr(productoEditar.costo?.toString() || "")
            } else {
                setFormData({
                    id: "",
                    nombre: "",
                    categoria: "",
                    precio_menor: 0,
                    precio_mayor: 0,
                    costo: 0,
                    codigo_barra: "",
                    descripcion: "",
                    peso_neto: null,
                    volumen_neto: null,
                    permite_venta_fraccionada: false,
                    unidad: "u"
                })
                // Reset string states for prices
                setPrecioMenorStr("")
                setPrecioMayorStr("")
                setCostoStr("")
            }
        }
    }, [open, productoEditar])

    const mostrarCampoPesoNeto = (categoria: string | null | undefined) => {
        return categoria === "MASCOTAS"
    }

    const mostrarCampoVolumenNeto = (categoria: string | null | undefined) => {
        const categoriasSueltos = ["SUELTOS", "QUIMICA", "SUELTOS - QUIMICA", "SUELTOS/QUIMICA"]
        return categoriasSueltos.includes(categoria || "")
    }

    // Validate form before showing confirmation
    const validateForm = (): boolean => {
        if (!formData.id?.trim()) {
            toast.error("El codigo (ID) es obligatorio")
            return false
        }
        if (!formData.nombre?.trim()) {
            toast.error("El nombre del producto es obligatorio")
            return false
        }
        const precioMenor = parseFloat(precioMenorStr) || 0
        if (precioMenor < 0) {
            toast.error("El precio menor debe ser mayor o igual a 0")
            return false
        }
        return true
    }

    // Handle form submission - shows confirmation dialog
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return

        // Update formData with current price strings
        setFormData(prev => ({
            ...prev,
            precio_menor: parseFloat(precioMenorStr) || 0,
            precio_mayor: parseFloat(precioMayorStr) || 0,
            costo: parseFloat(costoStr) || 0,
        }))

        // Show confirmation dialog
        setShowConfirmDialog(true)
    }

    // Actually perform the save operation
    const doSubmit = async () => {
        setShowConfirmDialog(false)
        setLoading(true)

        try {
            let result: Producto

            const precioMenor = parseFloat(precioMenorStr) || 0
            const precioMayor = parseFloat(precioMayorStr) || 0
            const costo = parseFloat(costoStr) || 0

            // Base data for update/create
            const commonData = {
                nombre: formData.nombre,
                categoria: formData.categoria || null,
                precio_menor: precioMenor,
                precio_mayor: precioMayor,
                costo: costo,
                codigo_barra: formData.codigo_barra || null,
                descripcion: formData.descripcion || null,
                peso_neto: formData.peso_neto ? Number(formData.peso_neto) : null,
                volumen_neto: formData.volumen_neto ? Number(formData.volumen_neto) : null,
                permite_venta_fraccionada: formData.permite_venta_fraccionada,
                unidad: formData.unidad,
            }

            if (isEditing) {
                // Check if ID has changed
                if (formData.id !== productoEditar.id) {
                    // ID migration
                    result = await api.migrarProducto(
                        productoEditar.id,
                        formData.id!,
                        { ...commonData, id: formData.id! } as ProductoInsert
                    )
                    toast.success("Producto migrado a nuevo ID correctamente")
                } else {
                    // Standard Update
                    result = await api.actualizarProducto(productoEditar.id, commonData)
                    toast.success("Producto actualizado correctamente")
                }
            } else {
                // Create
                result = await api.crearProducto({
                    ...commonData,
                    id: formData.id!,
                } as ProductoInsert)
                toast.success("Producto creado exitosamente")
            }

            onSuccess(result)
            onOpenChange(false)
        } catch (err) {
            if (err instanceof ApiError) {
                toast.error(err.message)
            } else {
                const msg = err instanceof Error ? err.message : "Error desconocido"
                if (msg.includes("duplicate key")) {
                    toast.error("Ya existe un producto con ese Codigo (ID)")
                } else {
                    toast.error("Error al guardar producto: " + msg)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (field: keyof ProductoInsert, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Handle price input changes with proper string handling
    const handlePriceChange = (value: string, setter: (v: string) => void) => {
        // Allow empty string, numbers, and decimal point
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setter(value)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] max-h-[85dvh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? "Modifica los detalles del producto. El codigo (ID) no se puede cambiar."
                                : "Ingresa los datos del nuevo producto. El Codigo es el identificador unico."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">

                        {/* Core Info Group */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="id" className="flex items-center gap-1">
                                    Codigo (ID)
                                    <span className="text-red-500">*</span>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="h-3 w-3 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>Identificador unico (ej: GAL-001)</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Label>
                                <Input
                                    id="id"
                                    value={formData.id}
                                    onChange={(e) => handleInputChange("id", e.target.value)}
                                    // disabled={isEditing} // Allow editing!
                                    placeholder="Ej: BEB-COCA-1.5"
                                    className={"font-mono uppercase"}
                                />
                                {isEditing && formData.id !== productoEditar?.id && (
                                    <p className="text-xs text-amber-600 font-medium">
                                        Cambiar el ID migrará el producto (si no tiene historial bloqueante).
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="codigo_barra">Codigo de Barras</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="codigo_barra"
                                        value={formData.codigo_barra || ""}
                                        onChange={(e) => handleInputChange("codigo_barra", e.target.value)}
                                        placeholder="Escanea o escribe..."
                                    />
                                    {/* Future: Add Scan Button here */}
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="nombre">Nombre del Producto <span className="text-red-500">*</span></Label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => handleInputChange("nombre", e.target.value)}
                                    placeholder="Ej: Coca Cola 1.5L Sabor Original"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="categoria">Categoría</Label>
                                <Select
                                    value={formData.categoria || ""}
                                    onValueChange={(v) => handleInputChange("categoria", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unidad">Unidad</Label>
                                <Select
                                    value={formData.unidad || "u"}
                                    onValueChange={(v) => handleInputChange("unidad", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="u">Unidad (u)</SelectItem>
                                        <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                                        <SelectItem value="L">Litro (L)</SelectItem>
                                        <SelectItem value="mt">Metro (mt)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-4">Precios y Costos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="precio_menor">Precio Menor <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            id="precio_menor"
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-7"
                                            value={precioMenorStr}
                                            onChange={(e) => handlePriceChange(e.target.value, setPrecioMenorStr)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="precio_mayor">Precio Mayor</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            id="precio_mayor"
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-7"
                                            value={precioMayorStr}
                                            onChange={(e) => handlePriceChange(e.target.value, setPrecioMayorStr)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="costo">Costo (Compra)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                        <Input
                                            id="costo"
                                            type="text"
                                            inputMode="decimal"
                                            className="pl-7"
                                            value={costoStr}
                                            onChange={(e) => handlePriceChange(e.target.value, setCostoStr)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-4">Detalles Adicionales</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="descripcion">Descripción / Notas</Label>
                                    <Textarea
                                        id="descripcion"
                                        placeholder="Detalles sobre el producto..."
                                        value={formData.descripcion || ""}
                                        onChange={(e) => handleInputChange("descripcion", e.target.value)}
                                    />
                                </div>

                                {/* Conditional Fields based on Category */}
                                {mostrarCampoPesoNeto(formData.categoria) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="peso_neto">Peso Neto (kg)</Label>
                                            <Input
                                                id="peso_neto"
                                                type="number"
                                                step="0.001"
                                                placeholder="21.000"
                                                value={formData.peso_neto || ""}
                                                onChange={(e) => handleInputChange("peso_neto", parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                )}

                                {mostrarCampoVolumenNeto(formData.categoria) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="volumen_neto">Volumen Neto (L)</Label>
                                            <Input
                                                id="volumen_neto"
                                                type="number"
                                                step="0.001"
                                                placeholder="5.000"
                                                value={formData.volumen_neto || ""}
                                                onChange={(e) => handleInputChange("volumen_neto", parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="fraccionada"
                                        checked={formData.permite_venta_fraccionada}
                                        onCheckedChange={(c) => handleInputChange("permite_venta_fraccionada", c === true)}
                                    />
                                    <Label htmlFor="fraccionada">Permitir venta fraccionada (Venta a granel)</Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-[#006AC0] hover:bg-[#005a9e]">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Guardar Cambios" : "Crear Producto"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Confirmar {isEditing ? "Cambios" : "Creación"}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    {isEditing
                                        ? "¿Estás seguro de que deseas guardar los cambios en este producto?"
                                        : "¿Estás seguro de que deseas crear este producto?"}
                                </p>
                                <div className="rounded-lg border p-3 bg-muted/50 space-y-1">
                                    <p className="font-medium text-foreground">{formData.nombre}</p>
                                    <p className="text-sm">Código: <span className="font-mono">{formData.id}</span></p>
                                    <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Menor:</span>{" "}
                                            <span className="font-medium">${precioMenorStr || "0"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Mayor:</span>{" "}
                                            <span className="font-medium">${precioMayorStr || "0"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Costo:</span>{" "}
                                            <span className="font-medium">${costoStr || "0"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={doSubmit}
                            disabled={loading}
                            className="bg-[#006AC0] hover:bg-[#005a9e]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                isEditing ? "Confirmar Cambios" : "Confirmar Creación"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
