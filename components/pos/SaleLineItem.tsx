import { useState } from 'react'
import { Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Producto } from '@/lib/api'
import { EditPriceDialog } from './EditPriceDialog'

export interface CarritoItem {
  producto: Producto
  cantidad: number
  precioUnitario: number
  subtotal: number
  // Custom pricing support
  tipoPrecio: 'menor' | 'mayor' | 'custom'
  precioOriginal: number
  descuentoLinea?: number
  descuentoLineaPorcentaje?: number
  motivoDescuento?: string
}

interface Props {
  item: CarritoItem
  onUpdatePrice: (newPrice: number, tipoPrecio: 'menor' | 'mayor' | 'custom', motivo: string) => void
  onUpdateQuantity: (newQty: number) => void
  onRemove: () => void
  userRole?: string
}

export function SaleLineItem({ item, onUpdatePrice, onUpdateQuantity, onRemove, userRole }: Props) {
  const [editingPrice, setEditingPrice] = useState(false)

  // Adapt CarritoItem to ProductoEnVenta format for the dialog
  const productoParaDialogo = {
    id_producto: item.producto.id,
    codigo_sku: item.producto.id, // Using id as sku/code
    nombre: item.producto.nombre,
    cantidad: item.cantidad,
    unidad: item.producto.unidad || 'u',
    precio_lista_menor: item.producto.precio_menor,
    precio_lista_mayor: item.producto.precio_mayor,
    costo_unitario: item.producto.costo,
    tipo_precio: item.tipoPrecio,
    precio_unitario_venta: item.precioUnitario, // This is the current sale price
    subtotal: item.subtotal
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
      <div className="flex-1 w-full">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.producto.nombre}</span>
          {item.tipoPrecio === 'custom' && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              Modificado
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {item.producto.id} • {item.producto.categoria}
        </div>

        {item.descuentoLineaPorcentaje && item.descuentoLineaPorcentaje > 0 && (
          <div className="text-xs text-green-600 mt-1 font-medium">
            💰 Descuento: -{item.descuentoLineaPorcentaje.toFixed(1)}%
            {item.motivoDescuento && <span className="text-muted-foreground font-normal"> ({item.motivoDescuento})</span>}
          </div>
        )}
      </div>

      {/* Controls Row (Mobile: Full width, Desktop: Auto) */}
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
        {/* Cantidad */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0.001"
            step="0.001"
            className="w-16 h-8 text-center px-1"
            value={item.cantidad}
            onChange={(e) => onUpdateQuantity(parseFloat(e.target.value) || 0)}
          />
          <span className="text-xs text-muted-foreground w-4 text-center">×</span>
        </div>

        {/* Precio Unitario */}
        <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[140px] justify-end">
          {editingPrice ? (
            <EditPriceDialog
              open={true}
              onOpenChange={setEditingPrice}
              producto={item.producto}
              tipoPrecioActual={item.tipoPrecio === 'mayor' ? 'mayor' : 'menor'}
              precioActual={item.precioUnitario}
              onSave={(newPrice, tipoPrecio, motivo) => {
                onUpdatePrice(newPrice, tipoPrecio, motivo)
                setEditingPrice(false)
              }}
              userRole={userRole}
            />
          ) : (
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 group cursor-pointer" onClick={() => setEditingPrice(true)}>
                <div className="font-bold">
                  ${item.precioUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {item.tipoPrecio !== 'custom' && (
                <div className="text-[10px] text-muted-foreground">
                  Lista: ${item.precioOriginal.toLocaleString('es-AR')}
                </div>
              )}
              {item.tipoPrecio === 'custom' && (
                <div className="text-[10px] line-through text-muted-foreground">
                  Lista: ${item.precioOriginal.toLocaleString('es-AR')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtotal */}
        <div className="font-bold text-right w-20 sm:w-24">
          ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
