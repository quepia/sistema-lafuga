"use client"

import { Producto } from "@/lib/supabase"
import {
  calcularPrecioPorKg,
  calcularPrecioPorLitro,
  deberiaMostrarPrecioPorKg,
  deberiaMostrarPrecioPorLitro,
  formatearPrecio,
  formatearPeso,
  formatearVolumen,
} from "@/lib/supabase-utils"

interface Props {
  producto: Producto
  showBothPrices?: boolean // Show both menor and mayor prices per unit
  className?: string
}

/**
 * Component to display unit-based pricing (price per kg or per liter)
 * Shows for MASCOTAS category (per kg) and SUELTOS/QUIMICA (per liter)
 */
export function PrecioUnitario({ producto, showBothPrices = false, className = "" }: Props) {
  const mostrarPorKg = deberiaMostrarPrecioPorKg(producto)
  const mostrarPorLitro = deberiaMostrarPrecioPorLitro(producto)

  if (!mostrarPorKg && !mostrarPorLitro) return null

  const precioPorKgMenor = producto.peso_neto
    ? calcularPrecioPorKg(producto.precio_menor, producto.peso_neto)
    : null

  const precioPorKgMayor = producto.peso_neto
    ? calcularPrecioPorKg(producto.precio_mayor, producto.peso_neto)
    : null

  const precioPorLitroMenor = producto.volumen_neto
    ? calcularPrecioPorLitro(producto.precio_menor, producto.volumen_neto)
    : null

  const precioPorLitroMayor = producto.volumen_neto
    ? calcularPrecioPorLitro(producto.precio_mayor, producto.volumen_neto)
    : null

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      {mostrarPorKg && precioPorKgMenor && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="font-medium text-[#006AC0]">
              ${formatearPrecio(precioPorKgMenor)}/kg
            </span>
            <span className="text-xs opacity-70">(menor)</span>
          </div>
          {showBothPrices && precioPorKgMayor && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-[#FF1F8F]">
                ${formatearPrecio(precioPorKgMayor)}/kg
              </span>
              <span className="text-xs opacity-70">(mayor)</span>
            </div>
          )}
          <div className="text-xs opacity-70">
            Contenido: {formatearPeso(producto.peso_neto!)}
          </div>
        </div>
      )}

      {mostrarPorLitro && precioPorLitroMenor && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="font-medium text-[#006AC0]">
              ${formatearPrecio(precioPorLitroMenor)}/L
            </span>
            <span className="text-xs opacity-70">(menor)</span>
          </div>
          {showBothPrices && precioPorLitroMayor && (
            <div className="flex items-center gap-1">
              <span className="font-medium text-[#FF1F8F]">
                ${formatearPrecio(precioPorLitroMayor)}/L
              </span>
              <span className="text-xs opacity-70">(mayor)</span>
            </div>
          )}
          <div className="text-xs opacity-70">
            Contenido: {formatearVolumen(producto.volumen_neto!)}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact version for lists and tables
 */
export function PrecioUnitarioCompacto({ producto, className = "" }: Props) {
  const mostrarPorKg = deberiaMostrarPrecioPorKg(producto)
  const mostrarPorLitro = deberiaMostrarPrecioPorLitro(producto)

  if (!mostrarPorKg && !mostrarPorLitro) return null

  const precioPorKgMenor = producto.peso_neto
    ? calcularPrecioPorKg(producto.precio_menor, producto.peso_neto)
    : null

  const precioPorLitroMenor = producto.volumen_neto
    ? calcularPrecioPorLitro(producto.precio_menor, producto.volumen_neto)
    : null

  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      {mostrarPorKg && precioPorKgMenor && (
        <span>${formatearPrecio(precioPorKgMenor)}/kg</span>
      )}
      {mostrarPorLitro && precioPorLitroMenor && (
        <span>${formatearPrecio(precioPorLitroMenor)}/L</span>
      )}
    </div>
  )
}

export default PrecioUnitario
