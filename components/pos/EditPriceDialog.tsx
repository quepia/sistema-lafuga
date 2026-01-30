"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Check } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Producto } from "@/lib/supabase"
import {
  calcularPorcentajeDescuento,
  calcularPrecioConDescuento,
  calcularMargenGanancia,
  esPrecioBajoCosto,
  requiereAutorizacion,
  getNivelAutorizacionDescuento,
  formatearPrecio,
  UserRole,
} from "@/lib/supabase-utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  producto: Producto
  tipoPrecioActual: "menor" | "mayor"
  precioActual: number
  onSave: (newPrice: number, tipoPrecio: "menor" | "mayor" | "custom", motivo: string) => void
  userRole?: string
}

type TipoAjuste = "porcentaje" | "monto" | "fijo"

/**
 * Dialog for editing the price of a line item in a sale
 * Supports percentage discounts, fixed amount discounts, or custom prices
 */
export function EditPriceDialog({
  open,
  onOpenChange,
  producto,
  tipoPrecioActual,
  precioActual,
  onSave,
  userRole = "vendedor",
}: Props) {
  const [tipoAjuste, setTipoAjuste] = useState<TipoAjuste>("porcentaje")
  const [porcentajeStr, setPorcentajeStr] = useState("0")
  const [montoDescuentoStr, setMontoDescuentoStr] = useState("0")
  const [precioFijoStr, setPrecioFijoStr] = useState(precioActual.toString())
  const [motivo, setMotivo] = useState("")
  const [tipoPrecioSeleccionado, setTipoPrecioSeleccionado] = useState<"menor" | "mayor">(tipoPrecioActual)

  // Reset values when dialog opens
  useEffect(() => {
    if (open) {
      setTipoAjuste("porcentaje")
      setPorcentajeStr("0")
      setMontoDescuentoStr("0")
      setPrecioFijoStr(precioActual.toString())
      setMotivo("")
      setTipoPrecioSeleccionado(tipoPrecioActual)
    }
  }, [open, precioActual, tipoPrecioActual])

  // Parse string values to numbers
  const porcentaje = parseFloat(porcentajeStr) || 0
  const montoDescuento = parseFloat(montoDescuentoStr) || 0
  const precioFijo = parseFloat(precioFijoStr) || 0

  // Handle numeric input changes
  const handleNumericChange = (value: string, setter: (v: string) => void) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setter(value)
    }
  }

  // Get the base price based on selected price type
  const precioBase = tipoPrecioSeleccionado === "mayor" ? producto.precio_mayor : producto.precio_menor

  // Calculate final price based on adjustment type
  const calcularPrecioFinal = (): number => {
    switch (tipoAjuste) {
      case "fijo":
        return precioFijo
      case "porcentaje":
        return calcularPrecioConDescuento(precioBase, porcentaje)
      case "monto":
        return Math.max(0, precioBase - montoDescuento)
      default:
        return precioBase
    }
  }

  const precioFinal = calcularPrecioFinal()
  const descuentoTotal = precioBase - precioFinal
  const descuentoPorcentaje = calcularPorcentajeDescuento(precioBase, precioFinal)
  const margen = calcularMargenGanancia(precioFinal, producto.costo)
  const margenOriginal = calcularMargenGanancia(precioBase, producto.costo)

  const necesitaAutorizacion = requiereAutorizacion(descuentoPorcentaje, userRole)
  const nivelAutorizado = getNivelAutorizacionDescuento(userRole)
  const precioBajoCosto = esPrecioBajoCosto(precioFinal, producto.costo)

  const handleSave = () => {
    if (descuentoPorcentaje > 10 && !motivo.trim()) {
      return // Validation handled in UI
    }

    if (necesitaAutorizacion) {
      return // Can't save without authorization
    }

    const tipoPrecioFinal = tipoAjuste === "fijo" || descuentoTotal > 0 ? "custom" : tipoPrecioSeleccionado
    onSave(precioFinal, tipoPrecioFinal, motivo)
    onOpenChange(false)
  }

  const tieneDescuento = descuentoTotal > 0
  const requiereMotivo = descuentoPorcentaje > 10 || precioBajoCosto
  const puedeGuardar = !necesitaAutorizacion && (!requiereMotivo || motivo.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Precio - Linea</DialogTitle>
          <DialogDescription>
            {producto.nombre}
            <span className="font-mono text-xs ml-2">({producto.id})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original prices info */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="text-sm font-medium">Precios de lista:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Precio Menor</div>
                <div className="font-bold text-[#006AC0]">${formatearPrecio(producto.precio_menor)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Precio Mayor</div>
                <div className="font-bold text-[#FF1F8F]">${formatearPrecio(producto.precio_mayor)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Costo</div>
                <div className="font-bold">${formatearPrecio(producto.costo)}</div>
              </div>
            </div>
          </div>

          {/* Price type selection */}
          <div className="space-y-2">
            <Label>Precio base a usar:</Label>
            <RadioGroup
              value={tipoPrecioSeleccionado}
              onValueChange={(v) => setTipoPrecioSeleccionado(v as "menor" | "mayor")}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="menor" id="precio-menor" />
                <Label htmlFor="precio-menor" className="font-normal">
                  Menor (${formatearPrecio(producto.precio_menor)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mayor" id="precio-mayor" />
                <Label htmlFor="precio-mayor" className="font-normal">
                  Mayor (${formatearPrecio(producto.precio_mayor)})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Adjustment type */}
          <div className="space-y-3">
            <Label>Tipo de ajuste:</Label>
            <RadioGroup value={tipoAjuste} onValueChange={(v) => setTipoAjuste(v as TipoAjuste)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="porcentaje" id="tipo-porcentaje" />
                <Label htmlFor="tipo-porcentaje" className="font-normal flex items-center gap-2">
                  Descuento %
                </Label>
                {tipoAjuste === "porcentaje" && (
                  <div className="flex items-center gap-1 ml-4">
                    <Input
                      type="text"
                      autoComplete="off"
                      inputMode="decimal"
                      className="w-20 h-8"
                      value={porcentajeStr}
                      onChange={(e) => handleNumericChange(e.target.value, setPorcentajeStr)}
                      placeholder="0"
                    />
                    <span>%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monto" id="tipo-monto" />
                <Label htmlFor="tipo-monto" className="font-normal flex items-center gap-2">
                  Descuento $ fijo
                </Label>
                {tipoAjuste === "monto" && (
                  <div className="flex items-center gap-1 ml-4">
                    <span>$</span>
                    <Input
                      type="text"
                      autoComplete="off"
                      inputMode="decimal"
                      className="w-28 h-8"
                      value={montoDescuentoStr}
                      onChange={(e) => handleNumericChange(e.target.value, setMontoDescuentoStr)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fijo" id="tipo-fijo" />
                <Label htmlFor="tipo-fijo" className="font-normal flex items-center gap-2">
                  Precio fijo
                </Label>
                {tipoAjuste === "fijo" && (
                  <div className="flex items-center gap-1 ml-4">
                    <span>$</span>
                    <Input
                      type="text"
                      autoComplete="off"
                      inputMode="decimal"
                      className="w-28 h-8"
                      value={precioFijoStr}
                      onChange={(e) => handleNumericChange(e.target.value, setPrecioFijoStr)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Results */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Precio final:</div>
                <div className="text-2xl font-bold">${formatearPrecio(precioFinal)}</div>
              </div>
              {tieneDescuento && (
                <div>
                  <div className="text-sm text-muted-foreground">Descuento:</div>
                  <div className="text-2xl font-bold text-green-600">
                    -{formatearPrecio(descuentoTotal)} ({descuentoPorcentaje.toFixed(1)}%)
                  </div>
                </div>
              )}
            </div>
            <div className={`text-sm ${margen < 0 ? "text-red-600" : "text-green-600"}`}>
              Margen: {margen.toFixed(1)}%
              {tieneDescuento && (
                <span className="text-muted-foreground ml-2">
                  (antes: {margenOriginal.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>

          {/* Warnings */}
          {precioBajoCosto && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>ADVERTENCIA:</strong> Precio por debajo del costo.
                Perdida: ${formatearPrecio(producto.costo - precioFinal)}
              </AlertDescription>
            </Alert>
          )}

          {necesitaAutorizacion && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Requiere autorizacion de supervisor.
                Su nivel: hasta {nivelAutorizado}%, solicitado: {descuentoPorcentaje.toFixed(1)}%
              </AlertDescription>
            </Alert>
          )}

          {/* Reason input */}
          {requiereMotivo && (
            <div className="space-y-2">
              <Label htmlFor="motivo">
                Motivo {descuentoPorcentaje > 10 ? "(obligatorio para desc. >10%)" : "(recomendado)"}:
              </Label>
              <Textarea
                id="motivo"
                placeholder="Cliente frecuente, compra por volumen, promocion, etc."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!puedeGuardar}>
            <Check className="h-4 w-4 mr-2" />
            Aplicar a Esta Linea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditPriceDialog
