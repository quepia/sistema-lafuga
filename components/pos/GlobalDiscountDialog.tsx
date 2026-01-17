"use client"

import { useState, useEffect } from "react"
import { Percent } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatearPrecio } from "@/lib/supabase-utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subtotal: number
  onApply: (descuento: number, porcentaje: number, motivo: string) => void
}

const MOTIVOS_COMUNES = [
  "Promocion del mes",
  "Cliente frecuente",
  "Compra por volumen",
  "Liquidacion",
  "Cortesia",
  "Otro",
]

type TipoDescuento = "porcentaje" | "monto"

/**
 * Dialog for applying a global discount to the entire sale
 */
export function GlobalDiscountDialog({ open, onOpenChange, subtotal, onApply }: Props) {
  const [tipo, setTipo] = useState<TipoDescuento>("porcentaje")
  const [porcentaje, setPorcentaje] = useState(10)
  const [montoFijo, setMontoFijo] = useState(0)
  const [motivo, setMotivo] = useState(MOTIVOS_COMUNES[0])
  const [motivoCustom, setMotivoCustom] = useState("")

  // Reset values when dialog opens
  useEffect(() => {
    if (open) {
      setTipo("porcentaje")
      setPorcentaje(10)
      setMontoFijo(0)
      setMotivo(MOTIVOS_COMUNES[0])
      setMotivoCustom("")
    }
  }, [open])

  const calcularDescuento = () => {
    if (tipo === "porcentaje") {
      return {
        monto: Math.round(subtotal * (porcentaje / 100) * 100) / 100,
        porcentaje: porcentaje,
      }
    } else {
      return {
        monto: montoFijo,
        porcentaje: subtotal > 0 ? Math.round((montoFijo / subtotal) * 10000) / 100 : 0,
      }
    }
  }

  const { monto, porcentaje: pctCalculado } = calcularDescuento()
  const total = subtotal - monto

  const handleApply = () => {
    const motivoFinal = motivo === "Otro" ? motivoCustom : motivo
    if (!motivoFinal.trim()) return

    onApply(monto, pctCalculado, motivoFinal)
    onOpenChange(false)
  }

  const puedeAplicar = (motivo === "Otro" ? motivoCustom.trim() : motivo.trim()) && monto > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Aplicar Descuento a la Venta
          </DialogTitle>
          <DialogDescription>
            Descuento global que se aplicara al total de la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current subtotal */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="text-sm text-muted-foreground">Subtotal actual</div>
            <div className="text-2xl font-bold">${formatearPrecio(subtotal)}</div>
          </div>

          {/* Discount type selection */}
          <div className="space-y-3">
            <Label>Tipo de descuento:</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoDescuento)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="porcentaje" id="desc-porcentaje" />
                <Label htmlFor="desc-porcentaje" className="font-normal flex items-center gap-2">
                  Porcentaje
                </Label>
                {tipo === "porcentaje" && (
                  <div className="flex items-center gap-2 ml-4">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-20 h-8"
                      value={porcentaje}
                      onChange={(e) => setPorcentaje(parseFloat(e.target.value) || 0)}
                    />
                    <span>%</span>
                    <span className="text-sm text-muted-foreground">
                      = ${formatearPrecio(monto)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monto" id="desc-monto" />
                <Label htmlFor="desc-monto" className="font-normal flex items-center gap-2">
                  Monto fijo
                </Label>
                {tipo === "monto" && (
                  <div className="flex items-center gap-2 ml-4">
                    <span>$</span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max={subtotal}
                      className="w-28 h-8"
                      value={montoFijo}
                      onChange={(e) => setMontoFijo(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground">
                      = {pctCalculado.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Reason selection */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo:</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_COMUNES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motivo === "Otro" && (
              <Input
                placeholder="Especificar motivo..."
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Results summary */}
          <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/30 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total antes:</div>
                <div className="font-bold">${formatearPrecio(subtotal)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Descuento:</div>
                <div className="font-bold text-green-600">-${formatearPrecio(monto)}</div>
              </div>
            </div>
            <div className="pt-3 border-t border-green-200 dark:border-green-800">
              <div className="text-sm text-muted-foreground">TOTAL FINAL:</div>
              <div className="text-3xl font-bold">${formatearPrecio(total)}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!puedeAplicar}>
            Aplicar Descuento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GlobalDiscountDialog
