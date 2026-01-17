"use client"

import { forwardRef } from "react"
import { Producto } from "@/lib/supabase"
import { PriceLabel } from "./PriceLabel"

interface LabelItem {
    producto: Producto
    cantidad: number
}

interface LabelGridProps {
    items: LabelItem[]
}

/**
 * Grid container for A4 price label printing
 * Renders labels in a 3-column grid with proper page-break handling
 * Handles multiplication: if cantidad is 5, renders 5 copies of the label
 */
export const LabelGrid = forwardRef<HTMLDivElement, LabelGridProps>(
    ({ items }, ref) => {
        // Expand items based on quantity - each item with cantidad N becomes N labels
        const expandedLabels: Producto[] = []

        for (const item of items) {
            for (let i = 0; i < item.cantidad; i++) {
                expandedLabels.push(item.producto)
            }
        }

        if (expandedLabels.length === 0) {
            return null
        }

        return (
            <div ref={ref} className="labels-print-container">
                <div className="labels-grid">
                    {expandedLabels.map((producto, index) => (
                        <PriceLabel key={`${producto.id}-${index}`} producto={producto} />
                    ))}
                </div>
            </div>
        )
    }
)

LabelGrid.displayName = "LabelGrid"

export default LabelGrid
