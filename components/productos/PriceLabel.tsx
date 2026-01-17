"use client"

import { Producto } from "@/lib/supabase"
import {
    calcularPrecioPorKg,
    calcularPrecioPorLitro,
    deberiaMostrarPrecioPorKg,
    deberiaMostrarPrecioPorLitro,
    formatearPrecio,
} from "@/lib/supabase-utils"

interface PriceLabelProps {
    producto: Producto
}

/**
 * Individual price label component for A4 printing
 * Designed to be cut manually - shows brand, product name, price, and unit price if applicable
 */
export function PriceLabel({ producto }: PriceLabelProps) {
    const mostrarPorKg = deberiaMostrarPrecioPorKg(producto)
    const mostrarPorLitro = deberiaMostrarPrecioPorLitro(producto)

    // Calculate unit prices
    const precioPorKg = producto.peso_neto
        ? calcularPrecioPorKg(producto.precio_menor, producto.peso_neto)
        : null

    const precioPorLitro = producto.volumen_neto
        ? calcularPrecioPorLitro(producto.precio_menor, producto.volumen_neto)
        : null

    return (
        <div className="price-label">
            {/* Brand */}
            <div className="label-brand">LA FUGA</div>

            {/* Product Name (max 2 lines) */}
            <div className="label-product-name">{producto.nombre}</div>

            {/* Main Price */}
            <div className="label-price">
                ${formatearPrecio(producto.precio_menor)}
            </div>

            {/* Unit Price (per kg or per liter) */}
            {mostrarPorKg && precioPorKg && (
                <div className="label-unit-price">
                    ${formatearPrecio(precioPorKg)}/kg
                </div>
            )}
            {mostrarPorLitro && precioPorLitro && (
                <div className="label-unit-price">
                    ${formatearPrecio(precioPorLitro)}/L
                </div>
            )}

            {/* Category badge */}
            {producto.categoria && (
                <div className="label-category">{producto.categoria}</div>
            )}
        </div>
    )
}

export default PriceLabel
